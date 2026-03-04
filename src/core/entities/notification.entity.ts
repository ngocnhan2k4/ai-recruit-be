import { GeneralQuery } from "@/common/types";
import { OrganizationWithDetails, User } from ".";

export interface NotificationFilter extends GeneralQuery {
  userId: User["id"];
  organizationId?: OrganizationWithDetails["id"];
}
