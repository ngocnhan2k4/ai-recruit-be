import { NotificationType } from "../entities";

export abstract class INotificationService {
  abstract createAndSendToUser(
    userId: string,
    notificationData: {
      title: string;
      message: string;
      type: NotificationType;
      senderId?: string;
      payload?: any;
    },
    organizationId?: string,
  ): Promise<{ success: boolean; notification?: Notification }>;
}
