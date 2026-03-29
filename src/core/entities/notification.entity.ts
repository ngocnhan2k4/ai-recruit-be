import { GeneralQuery } from "@/common/types";
import { NotiGroupTypeEnum } from "./enum.entity";
import { OrganizationWithDetails, User } from ".";

export interface NotificationFilter extends GeneralQuery {
  userId: User["id"];
  organizationId?: OrganizationWithDetails["id"];
  groupType?: NotiGroupTypeEnum;
  includeTypes?: string[];
  excludeTypes?: string[];
}
