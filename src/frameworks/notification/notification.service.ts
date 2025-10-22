import { Injectable, Logger } from "@nestjs/common";
import { Notification, NewNotification, INotificationRepository } from "@/core";
import { IWebSocketGateway } from "@/core/abstracts/websocket.abstract";

@Injectable()
export class NotificationService {
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
              userId: recipient.userId,
              organizationId: recipient.organizationId,
            },
          ],
        );

      // Send via WebSocket
      const sent = this.webSocketGateway.sendToUser(
        {
          userId: notification.userId,
          organizationId: notification.organizationId || undefined,
        },
        notification,
      );

      if (sent) {
        this.logger.log(
          `Notification created and sent to user ${notification.userId}, orgId ${notification.organizationId || "none"}: ${notification.title}`,
        );
      } else {
        this.logger.warn(
          `Notification created but user ${notification.userId}, orgId ${notification.organizationId || "none"} not connected for WebSocket delivery`,
        );
      }

      return { success: true, notification };
    } catch (error) {
      this.logger.error(
        `Error creating and sending notification to user ${recipient.userId}, orgId ${recipient.organizationId || "none"}:`,
        error,
      );
      return { success: false };
    }
  }
}
