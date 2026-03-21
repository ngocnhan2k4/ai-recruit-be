import { Subscription, UserSubscription } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { PaginatedResult } from "@/common/types";
import {
  GetListSubscriptionResponse,
  SubscriptionFilter,
  UserSubscriptionFilter,
} from "@/core/entities";

export type UpsertSubscriptionFeatureInput = {
  featureId: number;
  limit: number;
};

export abstract class ISubscriptionRepository extends IGenericRepository<Subscription> {
  abstract getListSubscriptions(
    query: SubscriptionFilter,
  ): Promise<PaginatedResult<GetListSubscriptionResponse>>;

  abstract getListUserSubscriptions(
    query: UserSubscriptionFilter,
  ): Promise<PaginatedResult<UserSubscription>>;

  abstract upsertSubscriptionFeatures(
    subscriptionId: string,
    items: UpsertSubscriptionFeatureInput[],
  ): Promise<number>;
}
