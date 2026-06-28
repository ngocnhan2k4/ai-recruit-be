import { NewNotification, Notification, NotificationType } from "../entities";

export abstract class INotificationService {
  abstract createAndSendToUser(
    newNotification: NewNotification,
    recipient: {
      userId: string;
      organizationId?: string;
    },
  ): Promise<{ success: boolean; notification?: Notification }>;

  /**
   * Gộp thông báo bình luận: tìm notification chưa đọc cùng loại + bài viết,
   * cập nhật nếu có hoặc tạo mới, rồi push qua WebSocket.
   * Dùng cho kiểu "A, B và N người khác đã bình luận..."
   */
  abstract upsertAggregatedAndSendToUser(params: {
    recipientId: string;
    senderId: string;
    objectId: string;
    type: NotificationType;
    title: string;
    buildMessage: (actorNames: string[], actorCount: number) => string;
    payload: Record<string, any>;
  }): Promise<{ success: boolean }>;

  abstract sendNotification(notification: Notification): boolean;
}
