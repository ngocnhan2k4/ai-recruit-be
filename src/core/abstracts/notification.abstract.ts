import { NewNotification, Notification } from "../entities";
import { IdentityUser } from "../entities/websocket.entity";

export abstract class INotificationService {
  abstract createAndSendToUser(
    newNotification: NewNotification,
    recipient: {
      userId: string;
      organizationId?: string;
    },
  ): Promise<{ success: boolean; notification?: Notification }>;

  abstract sendToUser(
    identity: IdentityUser,
    notification: Notification,
  ): boolean;
}
