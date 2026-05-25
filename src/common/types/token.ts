import { RoleEnum } from "@/common/constants";
import { UserStatusEnum } from "@/core";

export interface TokenPayload {
  userId: string;
  roles: RoleEnum[];
  status?: UserStatusEnum;
}
