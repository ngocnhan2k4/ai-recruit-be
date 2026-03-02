import { RoleEnum } from "@/common/constants";

export interface TokenPayload {
  userId: string;
  roles: RoleEnum[];
}
