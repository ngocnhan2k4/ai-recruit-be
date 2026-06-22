import {
  IOrganizationMembersRepository,
  OrganizationMember,
  User,
  UserStatusEnum,
} from "@/core";
import { GenericRepository } from "./generic-repository";
import { organizationMembers, users } from "../models";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "@/frameworks/data-services/postgres/types";
import { PaginatedResult } from "@/common/types";
import { eq, and, or, ilike, SQL, isNull, desc, lt } from "drizzle-orm";
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
        lt(organizationMembers.createdAt, new Date(query.cursor)),
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
      .innerJoin(
        users,
        and(
          eq(organizationMembers.userId, users.id),
          eq(users.status, UserStatusEnum.ACTIVE),
        ),
      )
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
          isNull(organizationMembers.deletedAt),
        ),
      )
      .limit(1)
      .execute();

    return member[0]?.role ?? null;
  }

  async isActiveMember(
    organizationId: string,
    userId: string,
  ): Promise<boolean> {
    const member = await this.db
      .select({
        id: organizationMembers.id,
      })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, organizationId),
          eq(organizationMembers.userId, userId),
          isNull(organizationMembers.deletedAt),
        ),
      )
      .limit(1)
      .execute();

    return member.length > 0;
  }
}
