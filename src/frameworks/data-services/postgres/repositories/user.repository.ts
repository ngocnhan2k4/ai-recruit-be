import { GenericRepository } from "./generic-repository";
import { type DBDrizzle } from "../types";
import { Inject, Injectable } from "@nestjs/common";
import { users, UserStatusEnum } from "../models";
import { NewUser, User } from "@/core/entities";
import {
  ilike,
  or,
  eq,
  count,
  isNotNull,
  and,
  SQL,
  SQLWrapper,
  sql,
} from "drizzle-orm";
import { isNull } from "lodash";
import { PaginatedResult } from "@/common/types/api";
import { GetUserQuery } from "@/core/entities/user.entity";
import { IUserRepository } from "@/core/abstracts/repositories/user-repository.abstract";
import { DrizzleCasbinAdapter } from "@/frameworks/auth-services/casbin/casbin.adapter";
import { PtypeEnum, RoleEnum } from "@/common/constants/roles";

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
        status: users.status,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        deletedAt: users.deletedAt,
      })
      .from(users) as any; // Type casting to any to bypass the type issue with complex where conditions

    if (conditions.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
      // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
      .where(conditions.length > 0 ? and(...conditions) : undefined);

    return {
      data: result,
      pagination: {
        total: Number(total[0].count) || 0,
      },
    };
  }

  async createUser(user: NewUser): Promise<User> {
    let createdUser: User;
    await this.db.transaction(async (tx) => {
      const userData = await tx.insert(users).values(user).returning();
      createdUser = userData[0];

      for (const role of user.roles as RoleEnum[]) {
        await this.casbinAdapter.addPolicy(PtypeEnum.BASIC_ASSIGNMENT, role, [
          userData[0].id,
        ]);
      }
    });
    return createdUser!;
  }
}
