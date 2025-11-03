import { OrganizationMember, User } from "@/core";
import { GenericRepository } from "./generic-repository";
import { organizationMembers, users } from "../models";
import { Inject, Injectable } from "@nestjs/common";
import {
  IOrganizationMembersRepository,
  MemberFilter,
} from "@/core/abstracts/repositories/organization-members-repository.abstract";
import { type DBDrizzle } from "@/frameworks/data-services/postgres/types";
import { PaginatedResult } from "@/common/types/api";
import { eq, and, gt, or, ilike, SQL, isNull, desc } from "drizzle-orm";
import { MemberQuery } from "@/core/entities/organization-members.entity";

@Injectable()
export class OrganizationMembersRepository
  extends GenericRepository<OrganizationMember, typeof organizationMembers>
  implements IOrganizationMembersRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, organizationMembers);
  }
  async getAllMembers(
    orgId: string,
    query: MemberQuery,
  ): Promise<
    PaginatedResult<
      Pick<User, "id" | "name" | "avatarUrl" | "email"> & { role: string }
    >
  > {
    const whereConditions: SQL<unknown>[] = [
      isNull(users.deletedAt),
      isNull(organizationMembers.deletedAt),
    ];

    if (query.role) {
      whereConditions.push(eq(organizationMembers.role as any, query.role));
    }

    if (query.keyword) {
      whereConditions.push(
        or(
          ilike(users.name, `%${query.keyword}%`),
          ilike(users.email, `%${query.keyword}%`),
        )!,
      );
    }

    if (query.cursor) {
      whereConditions.push(
        gt(organizationMembers.createdAt, new Date(query.cursor)),
      );
    }

    whereConditions.push(eq(organizationMembers.organizationId, orgId));

    const members = await this.db
      .select({
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
        email: users.email,
        role: organizationMembers.role,
        createdAt: organizationMembers.createdAt,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(and(...whereConditions))
      .orderBy(desc(organizationMembers.createdAt))
      .limit(query.limit + 1);

    const hasNextPage = members.length > query.limit;
    const data = hasNextPage ? members.slice(0, query.limit) : members;

    const nextCursor =
      hasNextPage && data.length > 0
        ? data[data.length - 1].createdAt.toISOString()
        : null;

    return {
      data: data,
      pagination: {
        nextCursor: nextCursor,
        hasNextPage,
      },
    };
  }

  async getMemberRole(orgId: string, userId: string): Promise<string | null> {
    const member = await this.db
      .select({
        role: organizationMembers.role,
      })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, orgId),
          eq(organizationMembers.userId, userId),
        ),
      )
      .limit(1)
      .execute();

    return member[0]?.role ?? null;
  }

  async getMembersByOrganizationId(
    organizationId: string,
    cursor: string,
    limit: number,
    filter?: MemberFilter,
  ): Promise<PaginatedResult<OrganizationMember>> {
    const whereConditions: SQL[] = [
      eq(organizationMembers.organizationId, organizationId),
    ];

    // Apply filters
    if (filter?.role) {
      whereConditions.push(eq(organizationMembers.role, filter.role));
    }

    if (filter?.keyword) {
      // Search by user name, email, or username
      whereConditions.push(
        or(
          ilike(users.name, `%${filter.keyword}%`),
          ilike(users.email, `%${filter.keyword}%`),
          ilike(users.username, `%${filter.keyword}%`),
        )!,
      );
    }

    // Add cursor condition if provided
    if (cursor) {
      whereConditions.push(gt(organizationMembers.createdAt, new Date(cursor)));
    }

    // Fetch limit + 1 to check if there's a next page
    const results = await this.db
      .select({
        id: organizationMembers.id,
        userId: organizationMembers.userId,
        organizationId: organizationMembers.organizationId,
        role: organizationMembers.role,
        createdAt: organizationMembers.createdAt,
        updatedAt: organizationMembers.updatedAt,
        deletedAt: organizationMembers.deletedAt,
      })
      .from(organizationMembers)
      .where(and(...whereConditions))
      .orderBy(desc(organizationMembers.createdAt))
      .limit(limit + 1);

    // Check if there's a next page
    const hasNextPage = results.length > limit;
    const data = hasNextPage ? results.slice(0, limit) : results;

    // Get the next cursor from the last item
    const nextCursor =
      hasNextPage && data.length > 0
        ? data[data.length - 1].createdAt.toISOString()
        : null;

    return {
      data: data,
      pagination: {
        nextCursor: nextCursor,
        hasNextPage,
      },
    };
  }
}
