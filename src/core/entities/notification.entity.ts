import { GeneralQuery } from "@/common/types/api";
import { OrganizationWithDetails, User } from ".";
import { UpdateJob } from "./job.entity";

export interface NotificationFilter extends GeneralQuery {
  userId: User["id"];
  organizationId?: OrganizationWithDetails["id"];
}

export interface CreateNotificationWithRecipients {
  notifications: Partial<Notification>[];
  updateJob?: UpdateJob;
}
