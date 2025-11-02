import { Injectable, Logger } from "@nestjs/common";
import { Notification, NewNotification } from "@/core";
import { INotificationRepository } from "@/core/abstracts/repositories/notification-repository.abstract";
import { IWebSocketGateway } from "@/core/abstracts/websocket.abstract";
import { INotificationService } from "@/core/abstracts/notification.abstract";
import { IdentityUser } from "@/core/entities/websocket.entity";

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

      // Send via WebSocket
      const sent = this.webSocketGateway.sendToUser(
        {
          userId: notification.receiverId,
          organizationId: notification.organizationId || undefined,
        },
        notification,
      );

      if (sent) {
        this.logger.log(
          `Notification created and sent to user ${notification.receiverId}, orgId ${notification.organizationId || "none"}: ${notification.title}`,
        );
      } else {
        this.logger.warn(
          `Notification created but user ${notification.receiverId}, orgId ${notification.organizationId || "none"} not connected for WebSocket delivery`,
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

  sendToUser(identity: IdentityUser, notification: Notification): boolean {
    return this.webSocketGateway.sendToUser(identity, notification);
  }
}
