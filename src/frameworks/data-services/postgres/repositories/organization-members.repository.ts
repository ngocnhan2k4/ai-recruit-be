import { OrganizationMember } from "@/core";
import { GenericRepository } from "./generic-repository";
import { organizationMembers, users } from "../models";
import { Inject, Injectable } from "@nestjs/common";
import {
  IOrganizationMembersRepository,
  MemberFilter,
} from "@/core/abstracts/repositories/organization-members.abstract";
import { type DBDrizzle } from "@/frameworks/data-services/postgres/types";
import { PaginatedResult } from "@/common/types/api";
import { eq, and, gt, desc, or, ilike, SQL } from "drizzle-orm";
import { OrganizationRole } from "@/common/constants/organization-roles";

@Injectable()
export class OrganizationMembersRepository
  extends GenericRepository<OrganizationMember, typeof organizationMembers>
  implements IOrganizationMembersRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, organizationMembers);
  }
  async findMemberByUserIdAndOrganizationId(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationMember | null> {
    const member = await this.db
      .select()
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, organizationId),
        ),
      )
      .limit(1);
    return member.length > 0 ? member[0] : null;
  }

  removeMember(userId: string, organizationId: string): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async updateMemberRole(
    userId: string,
    organizationId: string,
    newRole: OrganizationRole,
  ): Promise<OrganizationMember> {
    const updatedAt = new Date();
    const updated = await this.db
      .update(organizationMembers)
      .set({ role: newRole, updatedAt })
      .where(
        and(
          eq(organizationMembers.userId, userId),
          eq(organizationMembers.organizationId, organizationId),
        ),
      )
      .returning();
    return updated[0];
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
      .innerJoin(users, eq(organizationMembers.userId, users.id))
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
        cursor: nextCursor,
        hasNextPage,
      },
    };
  }

  async countMembersByOrganizationId(
    organizationId: string,
    filter?: MemberFilter,
  ): Promise<number> {
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

    const result = await this.db
      .select({ count: users.id })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .where(and(...whereConditions));

    return result.length;
  }
}
