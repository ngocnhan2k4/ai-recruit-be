import { RoleEnum } from "@/core/enums/roles";

export interface TokenPayload {
  sub: number;
  roles: RoleEnum[];
}
