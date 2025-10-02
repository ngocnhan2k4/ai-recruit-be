import { RoleEnum } from "@/common/constants/roles";

export interface TokenPayload {
  userId: string;
  roles: RoleEnum[];
}
