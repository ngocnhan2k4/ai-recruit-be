import { Company, User } from ".";

export interface NotificationFilter {
  userId: User["id"];
  organizationId?: Company["id"];
}
