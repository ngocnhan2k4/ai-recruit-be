import { GeneralQuery } from "@/common/types";
import { SubscriptionEnum, UserSubscriptionStatusEnum } from "./enum.entity";
import { Feature, Subscription } from ".";

export interface SubscriptionFilter extends GeneralQuery {
  name?: SubscriptionEnum;
  skipCount?: boolean;
  fields?: string[];
}

export interface UserSubscriptionFilter extends GeneralQuery {
  subscriptionId?: string;
  status?: UserSubscriptionStatusEnum;
}

export interface GetListSubscriptionResponse extends Subscription {
  features?: Array<
    Pick<Feature, "id" | "code" | "name"> & {
      limit: number;
    }
  >;
}

export interface GetUserFeaturesResponse {
  subscription:
    | (Pick<Subscription, "id" | "name" | "billingCycle"> & {
        status: UserSubscriptionStatusEnum;
        expiredAt: Date | null;
        startedAt: Date;
      })
    | null;
  features: Array<
    Pick<Feature, "id" | "code" | "name" | "description"> & {
      limit: number;
      usage: number;
      lastRefillAt: Date | null;
    }
  >;
}

export type UpdateUserSubscriptionInput = {
  userId: string;
  subscriptionId?: string;
  status?: UserSubscriptionStatusEnum;
  expiredAt?: Date;
};
