import { GeneralQuery } from "@/common/types/api";
import { Organization, User } from ".";

export interface NotificationFilter extends GeneralQuery {
  userId: User["id"];
  organizationId?: Organization["id"];
}
