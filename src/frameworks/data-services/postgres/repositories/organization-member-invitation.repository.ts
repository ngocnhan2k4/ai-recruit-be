import {
  IOrganizationMemberInvitationRepository,
  OrganizationMemberInvitation,
  User,
} from "@/core";
import { GenericRepository } from "./generic-repository";
import { organizationInvitations, users } from "../models";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "@/frameworks/data-services/postgres/types";
import { GeneralQuery, PaginatedResult } from "@/common/types/api";
import { ilike, or, and, lt, isNull, desc, SQL, eq } from "drizzle-orm";

@Injectable()
export class OrganizationMemberInvitationsRepository
  extends GenericRepository<
    OrganizationMemberInvitation,
    typeof organizationInvitations
  >
  implements IOrganizationMemberInvitationRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, organizationInvitations);
  }

  // Get invitations by organization ID
  async getByOrganizationId(
    organizationId: string,
    query: GeneralQuery,
  ): Promise<PaginatedResult<OrganizationMemberInvitation | null>> {
    const whereConditions: SQL<unknown>[] = [
      isNull(organizationInvitations.deletedAt),
      eq(organizationInvitations.organizationId, organizationId),
    ];

    if (query.cursor) {
      whereConditions.push(
        lt(organizationInvitations.createdAt, new Date(query.cursor)),
      );
    }

    const result = await this.db
      .select()
      .from(organizationInvitations)
      .where(and(...whereConditions))
      .orderBy(desc(organizationInvitations.createdAt))
      .limit(query.limit || 10);

    const hasNextPage = result.length > query.limit;
    const data = hasNextPage ? result.slice(0, query.limit) : result;

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

  // Get available users to invite
  async getUsersToInvite(
    query: GeneralQuery,
  ): Promise<
    PaginatedResult<Pick<
      User,
      "id" | "name" | "email" | "avatarUrl" | "username"
    > | null>
  > {
    const whereConditions: any[] = [isNull(users.deletedAt)];

    if (query.keyword) {
      whereConditions.push(
        or(
          ilike(users.name, `%${query.keyword}%`),
          ilike(users.email, `%${query.keyword}%`),
          ilike(users.username, `%${query.keyword}%`),
        ),
      );
    }

    if (query.cursor) {
      whereConditions.push(
        lt(organizationInvitations.createdAt, new Date(query.cursor)),
      );
    }

    const result = await this.db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        avatarUrl: users.avatarUrl,
        username: users.username,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(...whereConditions))
      .orderBy(desc(users.createdAt))
      .limit(query.limit || 10);

    const hasNextPage = result.length > query.limit;
    const data = hasNextPage ? result.slice(0, query.limit) : result;

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
