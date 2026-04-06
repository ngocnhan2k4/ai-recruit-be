import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";
import { NewNotification, Notification } from "../entities";

export abstract class INotificationService {
  abstract createAndSendToUser(
    newNotification: NewNotification,
    recipient: {
      userId: string;
      organizationId?: string;
    },
    tx?: DBDrizzleTransaction,
  ): Promise<{ success: boolean; notification?: Notification }>;

  abstract sendNotification(notification: Notification): boolean;
}
