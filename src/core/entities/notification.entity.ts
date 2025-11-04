import { GeneralQuery } from "@/common/types/api";
import { OrganizationWithDetails, User } from ".";

export interface NotificationFilter extends GeneralQuery {
  userId: User["id"];
  organizationId?: OrganizationWithDetails["id"];
}
