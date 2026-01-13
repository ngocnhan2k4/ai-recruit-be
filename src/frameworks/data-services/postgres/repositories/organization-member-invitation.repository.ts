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
import { alias } from "drizzle-orm/pg-core";

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

  // Get invitations by organization ID with user info
  async getByOrganizationId(
    organizationId: string,
    query: GeneralQuery,
  ): Promise<
    PaginatedResult<
      | (OrganizationMemberInvitation & {
          inviterName?: string | null;
          inviteeName?: string | null;
          inviteeAvatarUrl?: string | null;
        })
      | null
    >
  > {
    const whereConditions: SQL<unknown>[] = [
      isNull(organizationInvitations.deletedAt),
      eq(organizationInvitations.organizationId, organizationId),
      eq(organizationInvitations.status, "pending"), // Only return pending invitations
    ];

    if (query.cursor) {
      whereConditions.push(
        lt(organizationInvitations.createdAt, new Date(query.cursor)),
      );
    }

    // Create aliases for users table to join twice (inviter and invitee)
    const inviterTable = alias(users, "inviter");
    const inviteeTable = alias(users, "invitee");

    const result = await this.db
      .select({
        // Invitation fields
        id: organizationInvitations.id,
        organizationId: organizationInvitations.organizationId,
        actorId: organizationInvitations.actorId,
        receiverId: organizationInvitations.receiverId,
        type: organizationInvitations.type,
        status: organizationInvitations.status,
        role: organizationInvitations.role,
        expiresAt: organizationInvitations.expiresAt,
        createdAt: organizationInvitations.createdAt,
        updatedAt: organizationInvitations.updatedAt,
        deletedAt: organizationInvitations.deletedAt,
        // User enrichment fields
        inviterName: inviterTable.name,
        inviteeName: inviteeTable.name,
        inviteeAvatarUrl: inviteeTable.avatarUrl,
      })
      .from(organizationInvitations)
      .leftJoin(
        inviterTable,
        eq(organizationInvitations.actorId, inviterTable.id),
      )
      .leftJoin(
        inviteeTable,
        eq(organizationInvitations.receiverId, inviteeTable.id),
      )
      .where(and(...whereConditions))
      .orderBy(desc(organizationInvitations.createdAt))
      .limit((query.limit || 10) + 1);

    const hasNextPage = result.length > (query.limit || 10);
    const data = hasNextPage ? result.slice(0, query.limit || 10) : result;

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

  // Get invitation history (accepted or declined)
  async getInvitationHistory(
    organizationId: string,
    query: GeneralQuery,
  ): Promise<
    PaginatedResult<
      | (OrganizationMemberInvitation & {
          inviterName?: string | null;
          inviteeName?: string | null;
          inviteeAvatarUrl?: string | null;
        })
      | null
    >
  > {
    const whereConditions: SQL<unknown>[] = [
      isNull(organizationInvitations.deletedAt),
      eq(organizationInvitations.organizationId, organizationId),
    ];

    // Add status filter for accepted or declined
    const statusCondition = or(
      eq(organizationInvitations.status, "accepted"),
      eq(organizationInvitations.status, "declined"),
    );

    if (statusCondition) {
      whereConditions.push(statusCondition);
    }

    if (query.cursor) {
      whereConditions.push(
        lt(organizationInvitations.createdAt, new Date(query.cursor)),
      );
    }

    // Create aliases for users table to join twice (inviter and invitee)
    const inviterTable = alias(users, "inviter");
    const inviteeTable = alias(users, "invitee");

    const result = await this.db
      .select({
        // Invitation fields
        id: organizationInvitations.id,
        organizationId: organizationInvitations.organizationId,
        actorId: organizationInvitations.actorId,
        receiverId: organizationInvitations.receiverId,
        type: organizationInvitations.type,
        status: organizationInvitations.status,
        role: organizationInvitations.role,
        expiresAt: organizationInvitations.expiresAt,
        createdAt: organizationInvitations.createdAt,
        updatedAt: organizationInvitations.updatedAt,
        deletedAt: organizationInvitations.deletedAt,
        // User enrichment fields
        inviterName: inviterTable.name,
        inviteeName: inviteeTable.name,
        inviteeAvatarUrl: inviteeTable.avatarUrl,
      })
      .from(organizationInvitations)
      .leftJoin(
        inviterTable,
        eq(organizationInvitations.actorId, inviterTable.id),
      )
      .leftJoin(
        inviteeTable,
        eq(organizationInvitations.receiverId, inviteeTable.id),
      )
      .where(and(...whereConditions))
      .orderBy(desc(organizationInvitations.createdAt))
      .limit((query.limit || 10) + 1);

    const hasNextPage = result.length > (query.limit || 10);
    const data = hasNextPage ? result.slice(0, query.limit || 10) : result;

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
    const whereConditions: any = [isNull(users.deletedAt)];

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
