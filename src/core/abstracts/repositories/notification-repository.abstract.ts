import { PaginatedResult } from "@/common/types/api";
import { IGenericRepository } from "./generic-repository.abstract";
import { Notification, NewNotification } from "@/core/entities";
import { NotificationFilter } from "@/core/entities/notification.entity";

export abstract class INotificationRepository extends IGenericRepository<Notification> {
  abstract createNotificationWithRecipients(
    notification: NewNotification,
    recipients: {
      receiverId: string;
      organizationId?: string;
    }[],
  ): Promise<Notification[]>;

  abstract getNotificationsByUser(
    filter: NotificationFilter,
  ): Promise<PaginatedResult<Notification>>;
  abstract markAsRead(userNotificationIds: string[]): Promise<void>;

  abstract markAsDeleted(userNotificationIds: string[]): Promise<void>;

  abstract getUnreadCount(
    userId: string,
    organizationId?: string,
  ): Promise<number>;
}
