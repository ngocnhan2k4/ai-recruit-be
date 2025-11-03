import { NewNotification, Notification } from "../entities";

export abstract class INotificationService {
  abstract createAndSendToUser(
    newNotification: NewNotification,
    recipient: {
      userId: string;
      organizationId?: string;
    },
  ): Promise<{ success: boolean; notification?: Notification }>;
}
