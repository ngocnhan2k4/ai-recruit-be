import { SetMetadata } from "@nestjs/common";
import { PERM_KEY } from "@/common/constants/response";

export const CasbinPermission = (obj: string, act: string) =>
  SetMetadata(PERM_KEY, { obj, act });
