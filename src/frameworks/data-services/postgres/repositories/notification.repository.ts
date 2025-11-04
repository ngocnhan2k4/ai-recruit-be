import { GenericRepository } from "./generic-repository";
import { DBDrizzleTransaction, type DBDrizzle } from "../types";
import { Inject, Injectable } from "@nestjs/common";
import { notifications, userNotifications } from "../models/notification.model";
import {
  Notification,
  NewNotification,
  NewUserNotification,
} from "@/core/entities";
import { INotificationRepository } from "@/core/abstracts/repositories/notification-repository.abstract";
import { eq, and, isNull, desc, count, lt, inArray } from "drizzle-orm";
import { NotificationFilter } from "@/core/entities/notification.entity";
import { PaginatedResult } from "@/common/types/api";

@Injectable()
export class NotificationRepository
  extends GenericRepository<Notification, typeof notifications>
  implements INotificationRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, notifications);
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

    return createdUserNotifications.map((d) => ({
      ...d,
      ...createdNotification,
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

    const notificationsResult = await this.db
      .select({
        userNotification: userNotifications,
        notification: notifications,
      })
      .from(userNotifications)
      .innerJoin(
        notifications,
        eq(userNotifications.notificationId, notifications.id),
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
