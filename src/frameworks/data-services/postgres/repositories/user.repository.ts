import { GenericRepository } from "./generic-repository";
import { type DBDrizzle } from "../types";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { users } from "../models";
import { NewUser, User } from "@/core/entities";
import {
  ilike,
  or,
  eq,
  count,
  isNotNull,
  and,
  sql,
  desc,
  SQL,
  not,
  arrayOverlaps,
  gte,
  lte,
  countDistinct,
  asc,
} from "drizzle-orm";
import { isNull } from "lodash";
import { PaginatedResult } from "@/common/types";
import { GetUserQuery, UserTrends, UserTrendsQuery } from "@/core/entities";
import { IUserRepository } from "@/core/abstracts/repositories/user-repository.abstract";
import { DrizzleCasbinAdapter } from "@/frameworks/auth-services/casbin/casbin.adapter";
import { RoleEnum } from "@/common/constants";
import { convertDateToStr } from "@/common/utils";

@Injectable()
export class UserRepository
  extends GenericRepository<User, typeof users>
  implements IUserRepository
{
  private readonly casbinAdapter: DrizzleCasbinAdapter;
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, users);
    this.casbinAdapter = new DrizzleCasbinAdapter(db);
  }

  async getAllWithOffset(
    query: GetUserQuery,
  ): Promise<
    PaginatedResult<
      Pick<
        User,
        | "id"
        | "email"
        | "name"
        | "username"
        | "emailVerified"
        | "phone"
        | "phoneVerified"
        | "roles"
        | "status"
        | "createdAt"
        | "updatedAt"
        | "deletedAt"
      >
    >
  > {
    const conditions: any[] = [];
    if (query.keyword) {
      const keyword = `%${query.keyword.toLowerCase()}%`;
      conditions.push(
        or(
          ilike(users.username, keyword),
          ilike(users.name, keyword),
          ilike(users.email, keyword),
        ),
      );
    }
    if (query.isActive !== undefined) {
      conditions.push(eq(users.status, "active"));
    }
    if (query.isDeleted !== undefined) {
      if (query.isDeleted) {
        conditions.push(isNotNull(users.deletedAt));
      } else {
        conditions.push(isNull(users.deletedAt));
      }
    }
    let queryBuilder = this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        username: users.username,
        emailVerified: users.emailVerified,
        phone: users.phone,
        phoneVerified: users.phoneVerified,
        roles: users.roles,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        deletedAt: users.deletedAt,
      })
      .from(users) as any; // Type casting to any to bypass the type issue with complex where conditions

    if (conditions.length > 0) {
      queryBuilder = queryBuilder.where(and(...conditions));
    }
    const result = await queryBuilder
      .limit(query.limit || 10)
      .offset(query.page ? (query.page - 1) * (query.limit || 10) : 0)
      .orderBy(
        query.sortBy
          ? query.sortDirection === "desc"
            ? sql`${sql.raw(query.sortBy)} DESC`
            : sql`${sql.raw(query.sortBy)} ASC`
          : sql`${users.createdAt} DESC`,
      );

    const total = await this.db
      .select({
        count: count(),
      })
      .from(users)
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      data: result,
      pagination: {
        total: Number(total[0].count) || 0,
      },
    };
  }

  async createUser(user: NewUser): Promise<User> {
    const userData = await this.db.insert(users).values(user).returning();
    return userData[0];
  }

  async adminUpdateUser(userId: string, user: Partial<User>): Promise<User> {
    const updatedUser = (
      await this.db
        .update(users)
        .set({
          ...user,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning()
    )[0];
    if (!updatedUser) {
      throw new NotFoundException("User not found");
    }
    return updatedUser;
  }

  async getAllAdminUsers(
    query: GetUserQuery,
  ): Promise<
    PaginatedResult<
      Pick<
        User,
        | "id"
        | "email"
        | "name"
        | "username"
        | "emailVerified"
        | "phone"
        | "phoneVerified"
        | "roles"
        | "status"
        | "createdAt"
        | "updatedAt"
        | "deletedAt"
      >
    >
  > {
    const { page = 1, limit = 10 } = query;

    const conditions: SQL[] = [];

    // Filter for admin roles
    conditions.push(
      arrayOverlaps(users.roles, [RoleEnum.ADMIN, RoleEnum.SUPER_ADMIN]),
    );

    if (query.keyword) {
      const keyword = `%${query.keyword.toLowerCase()}%`;
      conditions.push(
        or(
          ilike(sql`coalesce(${users.username}, '')`, keyword),
          ilike(sql`coalesce(${users.name}, '')`, keyword),
          ilike(users.email, keyword),
        )!,
      );
    }

    if (query.isActive !== undefined) {
      conditions.push(eq(users.status, "active"));
    }

    if (query.isActive !== undefined) {
      if (query.isActive) {
        conditions.push(eq(users.status, "active"));
      } else {
        conditions.push(not(eq(users.status, "active")));
      }
    }

    const queryBuilder = this.db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        username: users.username,
        emailVerified: users.emailVerified,
        phone: users.phone,
        phoneVerified: users.phoneVerified,
        roles: users.roles,
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        deletedAt: users.deletedAt,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt))
      .offset((page - 1) * limit)
      .limit(limit + 1);

    const result = await queryBuilder;

    const hasNextPage = result.length > limit;
    const data = hasNextPage ? result.slice(0, limit) : result;

    // Get total count for pagination
    const totalResult = await this.db
      .select({ count: count() })
      .from(users)
      .where(and(...conditions));

    const total = Number(totalResult[0]?.count ?? 0);

    return {
      data,
      pagination: {
        hasNextPage,
        total,
      },
    };
  }

  async getUserTrends(params: UserTrendsQuery): Promise<UserTrends[]> {
    const { fromDate, toDate } = params;

    const whereConditions: SQL[] = [];

    if (fromDate) {
      whereConditions.push(gte(users.createdAt, new Date(fromDate)));
    }
    if (toDate) {
      whereConditions.push(lte(users.createdAt, new Date(toDate)));
    }

    const result = await this.db
      .select({
        date: users.createdAt,
        count: countDistinct(users.id).as("count"),
      })
      .from(users)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(users.createdAt)
      .orderBy(asc(users.createdAt));

    return result.map((r) => ({
      date: convertDateToStr(r.date),
      count: Number(r.count),
    }));
  }
}
