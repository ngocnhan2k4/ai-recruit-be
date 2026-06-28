import { NewNotification, Notification, NotificationType } from "@/core";
import { INotificationService } from "@/core/abstracts/notification.abstract";
import { INotificationRepository } from "@/core/abstracts/repositories/notification-repository.abstract";
import { IWebSocketGateway } from "@/core/abstracts/websocket.abstract";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class NotificationService implements INotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(
    private readonly webSocketGateway: IWebSocketGateway,
    private readonly notificationRepository: INotificationRepository,
  ) {}

  async createAndSendToUser(
    newNotification: NewNotification,
    recipient: {
      userId: string;
      organizationId?: string;
    },
  ): Promise<{ success: boolean; notification?: Notification }> {
    try {
      const [notification] =
        await this.notificationRepository.createNotificationWithRecipients(
          newNotification,
          [
            {
              receiverId: recipient.userId,
              organizationId: recipient.organizationId,
            },
          ],
        );

      this.sendNotification(notification);

      return { success: true, notification };
    } catch (error) {
      this.logger.error(
        `Error creating and sending notification to user ${recipient.userId}, orgId ${recipient.organizationId || "none"}:`,
        error,
      );
      return { success: false };
    }
  }

  async upsertAggregatedAndSendToUser(params: {
    recipientId: string;
    senderId: string;
    objectId: string;
    type: NotificationType;
    title: string;
    buildMessage: (actorNames: string[], actorCount: number) => string;
    payload: Record<string, any>;
  }): Promise<{ success: boolean }> {
    try {
      const notification =
        await this.notificationRepository.upsertAggregatedNotification(params);

      if (notification) {
        this.sendNotification({
          ...notification,
          receiverId: params.recipientId,
        });
      }

      return { success: true };
    } catch (error) {
      this.logger.error(
        `Error upserting aggregated notification for user ${params.recipientId}:`,
        error,
      );
      return { success: false };
    }
  }

  sendNotification(notification: Notification): boolean {
    const sent = this.webSocketGateway.sendToUser(
      {
        userId: notification.receiverId,
        organizationId: notification.organizationId || undefined,
      },
      notification,
    );

    if (sent) {
      this.logger.log(
        `Notification delivered to user ${notification.receiverId}, orgId ${notification.organizationId || "none"}: ${notification.title}`,
      );
    } else {
      this.logger.warn(
        `User ${notification.receiverId}, orgId ${notification.organizationId || "none"} not connected for WebSocket delivery`,
      );
    }

    return sent;
  }
}
