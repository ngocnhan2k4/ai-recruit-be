import { RoleEnum } from "@/common/constants/roles";

export interface TokenPayload {
  sub: number;
  roles: RoleEnum[];
}
