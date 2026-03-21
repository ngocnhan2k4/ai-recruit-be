import { GeneralQuery } from "@/common/types";
import { SubscriptionEnum, UserSubscriptionStatusEnum } from "./enum.entity";

export interface SubscriptionFilter extends GeneralQuery {
  name?: SubscriptionEnum;
  skipCount?: boolean;
}

export interface UserSubscriptionFilter extends GeneralQuery {
  subscriptionId?: string;
  status?: UserSubscriptionStatusEnum;
}
