import { GenericRepository } from "./generic-repository";
import { DBDrizzleTransaction, type DBDrizzle } from "../types";
import { Inject, Injectable } from "@nestjs/common";
import { notifications, userNotifications } from "../models/notification.model";
import {
  NotiGroupTypeEnum,
  Notification,
  NewNotification,
  NewUserNotification,
} from "@/core/entities";
import { INotificationRepository } from "@/core/abstracts/repositories/notification-repository.abstract";
import {
  eq,
  and,
  isNull,
  desc,
  count,
  lt,
  inArray,
  notInArray,
  sql,
} from "drizzle-orm";
import { NotificationFilter } from "@/core/entities/notification.entity";
import { PaginatedResult } from "@/common/types";
import { organizationInvitations, organizations, users } from "../models";

@Injectable()
export class NotificationRepository
  extends GenericRepository<Notification, typeof notifications>
  implements INotificationRepository
{
  private readonly groupTypeMap: Record<
    NotiGroupTypeEnum,
    (typeof notifications.$inferSelect)["type"][]
  > = {
    [NotiGroupTypeEnum.RECRUITMENT]: [
      "job_applied",
      "job_matched",
      "admin_job_approved",
      "admin_job_rejected",
    ],
    [NotiGroupTypeEnum.PROFILE]: [
      "cv_approved",
      "cv_rejected",
      "profile_viewed",
    ],
    [NotiGroupTypeEnum.ORG]: ["organization_invitation"],
    [NotiGroupTypeEnum.SYSTEM]: ["system", "job_approved"],
  };

  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, notifications);
  }

  async deleteInviationNotifications(
    organizationId: string,
    inviteeId: string,
    tx?: DBDrizzleTransaction,
  ): Promise<void> {
    const dbClient = tx || this.db;
    await dbClient.delete(userNotifications).where(
      and(
        eq(userNotifications.receiverId, inviteeId),
        inArray(
          userNotifications.notificationId,
          dbClient
            .select({ id: notifications.id })
            .from(notifications)
            .where(
              and(
                eq(notifications.type, "organization_invitation"),
                sql`(${notifications.payload}->>'orgId')::uuid = ${organizationId}`,
                sql`(${notifications.payload}->>'userId')::uuid = ${inviteeId}`,
              ),
            ),
        ),
      ),
    );
  }

  async updateNotificationPayload(
    notificationId: string,
    payload: Record<string, any>,
    tx?: DBDrizzleTransaction,
  ): Promise<void> {
    const dbClient = tx || this.db;
    await dbClient
      .update(notifications)
      .set({ payload })
      .where(eq(notifications.id, notificationId));
  }

  async preCreateNotifications(
    tx: DBDrizzleTransaction,
    notification: NewNotification,
    recipients: {
      receiverId: string;
      organizationId?: string;
    }[],
  ): Promise<Notification[]> {
    const [createdNotification] = await tx
      .insert(notifications)
      .values(notification)
      .returning();

    const userNotificationData: NewUserNotification[] = recipients.map((d) => ({
      notificationId: createdNotification.id,
      receiverId: d.receiverId,
      organizationId: d.organizationId,
    }));

    const createdUserNotifications = await tx
      .insert(userNotifications)
      .values(userNotificationData)
      .returning();

    let senderInfo;
    if (createdNotification.senderId) {
      senderInfo = await tx
        .select({
          name: users.name,
          avatarUrl: users.avatarUrl,
        })
        .from(users)
        .where(eq(users.id, createdNotification.senderId));
    }

    let organizationInfo;
    if (createdNotification.payload?.orgId) {
      organizationInfo = await tx
        .select({
          name: organizations.name,
          logoUrl: organizations.logoUrl,
        })
        .from(organizations)
        .where(eq(organizations.id, createdNotification.payload.orgId));
    }

    return createdUserNotifications.map((d) => ({
      ...d,
      ...createdNotification,
      senderInfo,
      organizationInfo,
    }));
  }

  async createNotificationWithRecipients(
    notification: NewNotification,
    recipients: {
      receiverId: string;
      organizationId?: string;
    }[],
  ): Promise<Notification[]> {
    return await this.db.transaction(async (tx) => {
      return await this.preCreateNotifications(tx, notification, recipients);
    });
  }

  async getNotificationsByUser(
    filter: NotificationFilter,
  ): Promise<PaginatedResult<Notification>> {
    const whereConditions = [
      eq(userNotifications.receiverId, filter.userId),
      isNull(userNotifications.deletedAt),
    ];

    if (filter.organizationId) {
      whereConditions.push(
        eq(userNotifications.organizationId, filter.organizationId),
      );
    }

    if (filter.cursor) {
      whereConditions.push(
        lt(notifications.createdAt, new Date(filter.cursor)),
      );
    }

    if (filter.includeTypes && filter.includeTypes.length > 0) {
      whereConditions.push(
        inArray(
          notifications.type,
          filter.includeTypes as (typeof notifications.$inferSelect)["type"][],
        ),
      );
    }

    if (filter.excludeTypes && filter.excludeTypes.length > 0) {
      whereConditions.push(
        notInArray(
          notifications.type,
          filter.excludeTypes as (typeof notifications.$inferSelect)["type"][],
        ),
      );
    }

    if (filter.groupType) {
      const groupTypes = this.groupTypeMap[filter.groupType];
      if (groupTypes?.length) {
        whereConditions.push(inArray(notifications.type, groupTypes));
      }
    }

    const orgIdFromPayload = sql<string>`(${notifications.payload} ->> 'orgId')::uuid`;
    const orgInvitationId = sql<string>`(${notifications.payload} ->> 'orgInvitationId')::uuid`;

    const notificationsResult = await this.db
      .select({
        userNotification: userNotifications,
        notification: notifications,
        sender: {
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
        organization: {
          name: organizations.name,
          logoUrl: organizations.logoUrl,
        },
        orgInvitation: {
          status: organizationInvitations.status,
        },
      })
      .from(userNotifications)
      .innerJoin(
        notifications,
        eq(userNotifications.notificationId, notifications.id),
      )
      .leftJoin(users, eq(notifications.senderId, users.id))
      .leftJoin(organizations, eq(orgIdFromPayload, organizations.id))
      .leftJoin(
        organizationInvitations,
        eq(orgInvitationId, organizationInvitations.id),
      )
      .where(and(...whereConditions))
      .orderBy(desc(notifications.createdAt))
      .limit(filter.limit + 1);

    const hasNextPage = notificationsResult.length > filter.limit;

    const slicedResults = hasNextPage
      ? notificationsResult.slice(0, filter.limit)
      : notificationsResult;

    const nextCursor = hasNextPage
      ? slicedResults[
          slicedResults.length - 1
        ].notification.createdAt.toISOString()
      : null;

    return {
      data: slicedResults.map((row) => ({
        ...row.notification,
        ...row.userNotification,
        sender: row.sender,
        organization: row.organization,
        orgInvitation: row.orgInvitation,
      })),
      pagination: {
        nextCursor,
        hasNextPage,
      },
    };
  }

  async markAsRead(userNotificationIds: string[]): Promise<void> {
    if (!userNotificationIds.length) return;

    await this.db
      .update(userNotifications)
      .set({ readAt: new Date() })
      .where(
        and(
          inArray(userNotifications.id, userNotificationIds),
          isNull(userNotifications.deletedAt),
        ),
      );
  }

  async markAsDeleted(userNotificationIds: string[]): Promise<void> {
    if (!userNotificationIds.length) return;

    await this.db
      .update(userNotifications)
      .set({ deletedAt: new Date() })
      .where(
        and(
          inArray(userNotifications.id, userNotificationIds),
          isNull(userNotifications.deletedAt),
        ),
      );
  }

  async getUnreadCount(
    userId: string,
    organizationId?: string,
  ): Promise<number> {
    const whereConditions = [
      eq(userNotifications.receiverId, userId),
      isNull(userNotifications.readAt),
      isNull(userNotifications.deletedAt),
    ];

    if (organizationId) {
      whereConditions.push(
        eq(userNotifications.organizationId, organizationId),
      );
    }

    const [{ count: unreadCount }] = await this.db
      .select({ count: count() })
      .from(userNotifications)
      .where(and(...whereConditions));

    return unreadCount;
  }
}
