import { PaginatedResult } from "@/common/types";
import { INotificationRepository } from "@/core/abstracts/repositories/notification-repository.abstract";
import {
  NewNotification,
  NewUserNotification,
  NotiGroupTypeEnum,
  Notification,
} from "@/core/entities";
import { NotificationFilter } from "@/core/entities/notification.entity";
import { Inject, Injectable } from "@nestjs/common";
import {
  and,
  count,
  desc,
  eq,
  inArray,
  isNull,
  lt,
  notInArray,
  sql,
} from "drizzle-orm";
import {
  organizationInvitations,
  organizations,
  tasks,
  users,
} from "../models";
import { notifications, userNotifications } from "../models/notification.model";
import { DBDrizzleTransaction, type DBDrizzle } from "../types";
import { GenericRepository } from "./generic-repository";

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
    [NotiGroupTypeEnum.SYSTEM]: ["system", "job_approved", "feedback_assigned"],
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

  async createNotificationWithRecipients(
    notification: NewNotification,
    recipients: {
      receiverId: string;
      organizationId?: string;
    }[],
  ): Promise<Notification[]> {
    return this.executeWithTransaction(async (tx) => {
      const [createdNotification] = await tx
        .insert(notifications)
        .values(notification)
        .returning();

      const userNotificationData: NewUserNotification[] = recipients.map(
        (d) => ({
          notificationId: createdNotification.id,
          receiverId: d.receiverId,
          organizationId: d.organizationId,
        }),
      );

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
    });
  }

  async upsertAggregatedNotification(params: {
    recipientId: string;
    senderId: string;
    objectId: string;
    type: string;
    title: string;
    buildMessage: (actorNames: string[], actorCount: number) => string;
    payload: Record<string, any>;
  }): Promise<Notification | null> {
    const {
      recipientId,
      senderId,
      objectId,
      type,
      title,
      buildMessage,
      payload,
    } = params;

    return this.executeWithTransaction(async (tx) => {
      // Tìm notification chưa đọc cùng (người nhận, loại, bài viết)
      const existingRows = await tx
        .select({
          userNotification: userNotifications,
          notification: notifications,
        })
        .from(userNotifications)
        .innerJoin(
          notifications,
          eq(userNotifications.notificationId, notifications.id),
        )
        .where(
          and(
            eq(userNotifications.receiverId, recipientId),
            isNull(userNotifications.readAt),
            isNull(userNotifications.deletedAt),
            eq(
              notifications.type,
              type as (typeof notifications.$inferSelect)["type"],
            ),
            sql`(${notifications.payload} ->> 'blogId') = ${objectId}`,
          ),
        )
        .limit(1);

      const existing = existingRows[0];

      const currentActorIds =
        (existing?.notification.actorIds as string[]) ?? [];
      const updatedActorIds = currentActorIds.includes(senderId)
        ? currentActorIds
        : [...currentActorIds, senderId];
      const actorCount = updatedActorIds.length;

      const topActorIds = updatedActorIds.slice(-2).reverse();
      const actorUsers = topActorIds.length
        ? await tx
            .select({ id: users.id, name: users.name })
            .from(users)
            .where(inArray(users.id, topActorIds))
        : [];

      const actorNames = topActorIds.map(
        (id) => actorUsers.find((u) => u.id === id)?.name ?? "Người dùng",
      );
      const message = buildMessage(actorNames, actorCount);

      if (existing) {
        // Cập nhật notification đã có
        const [updated] = await tx
          .update(notifications)
          .set({
            actorIds: updatedActorIds,
            actorCount,
            message,
            updatedAt: new Date(),
          })
          .where(eq(notifications.id, existing.notification.id))
          .returning();

        return {
          ...existing.userNotification,
          ...updated,
          sender: null,
          organization: null,
          orgInvitation: null,
          task: null,
        };
      }

      // Tạo notification mới
      const [created] = await tx
        .insert(notifications)
        .values({
          senderId,
          title,
          message,
          type: type as (typeof notifications.$inferSelect)["type"],
          payload: payload as (typeof notifications.$inferSelect)["payload"],
          actorIds: updatedActorIds,
          actorCount,
        })
        .returning();

      const [userNotif] = await tx
        .insert(userNotifications)
        .values({ notificationId: created.id, receiverId: recipientId })
        .returning();

      return {
        ...userNotif,
        ...created,
        sender: null,
        organization: null,
        orgInvitation: null,
        task: null,
      };
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
    const taskIdFromPayload = sql<string>`(${notifications.payload} ->> 'taskId')::uuid`;

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
        task: {
          id: tasks.id,
          status: tasks.status,
          type: tasks.type,
          result: tasks.result,
        },
      })
      .from(userNotifications)
      .innerJoin(
        notifications,
        eq(userNotifications.notificationId, notifications.id),
      )
      .leftJoin(tasks, eq(taskIdFromPayload, tasks.id))
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
      ? slicedResults.at(-1)!.notification.createdAt.toISOString()
      : null;

    return {
      data: slicedResults.map((row) => ({
        ...row.notification,
        ...row.userNotification,
        sender: row.sender,
        organization: row.organization,
        orgInvitation: row.orgInvitation,
        task: row.task,
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
