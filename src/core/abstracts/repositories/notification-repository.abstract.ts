import { PaginatedResult } from "@/common/types";
import { IGenericRepository } from "./generic-repository.abstract";
import { Notification, NewNotification } from "@/core/entities";
import { NotificationFilter } from "@/core/entities/notification.entity";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

export abstract class INotificationRepository extends IGenericRepository<Notification> {
  abstract createNotificationWithRecipients(
    notification: NewNotification,
    recipients: {
      receiverId: string;
      organizationId?: string;
    }[],
  ): Promise<Notification[]>;

  /**
   * Tìm notification chưa đọc có cùng (recipient, type, objectId).
   * Nếu tìm thấy → cập nhật danh sách actor + message.
   * Nếu không → tạo notification mới.
   * Dùng cho các thông báo kiểu "A, B và N người khác đã bình luận..."
   */
  abstract upsertAggregatedNotification(params: {
    recipientId: string;
    senderId: string;
    objectId: string;
    type: string;
    title: string;
    buildMessage: (actorNames: string[], actorCount: number) => string;
    templateKey?: string;
    buildTemplateData?: (
      actorNames: string[],
      actorCount: number,
    ) => Record<string, any>;
    payload: Record<string, any>;
  }): Promise<Notification | null>;

  abstract getNotificationsByUser(
    filter: NotificationFilter,
  ): Promise<PaginatedResult<Notification>>;
  abstract markAsRead(userNotificationIds: string[]): Promise<void>;

  abstract markAsDeleted(userNotificationIds: string[]): Promise<void>;

  abstract deleteInviationNotifications(
    organizationId: string,
    inviteeId: string,
    tx?: DBDrizzleTransaction,
  ): Promise<void>;

  abstract updateNotificationPayload(
    notificationId: string,
    payload: Record<string, any>,
    tx?: DBDrizzleTransaction,
  ): Promise<void>;

  abstract getUnreadCount(
    userId: string,
    organizationId?: string,
  ): Promise<number>;
}
