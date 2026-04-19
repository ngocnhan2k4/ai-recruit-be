import { SetMetadata } from "@nestjs/common";
import { UserStatusEnum } from "@/core";

export const ALLOWED_USER_STATUSES_KEY = "allowedUserStatuses";

export const AllowedUserStatuses = (...statuses: UserStatusEnum[]) =>
  SetMetadata(ALLOWED_USER_STATUSES_KEY, statuses);
