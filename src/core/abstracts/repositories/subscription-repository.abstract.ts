import { Subscription } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { PaginatedResult } from "@/common/types";
import {
  GetListSubscriptionResponse,
  SubscriptionFilter,
} from "@/core/entities";
import type { FeatureCodeEnum } from "@/core";

export type UpsertSubscriptionFeatureInput = {
  featureId: number;
  limit: number;
};

export abstract class ISubscriptionRepository extends IGenericRepository<Subscription> {
  abstract getListSubscriptions(
    query: SubscriptionFilter,
  ): Promise<PaginatedResult<GetListSubscriptionResponse>>;

  abstract upsertSubscriptionFeatures(
    subscriptionId: string,
    items: UpsertSubscriptionFeatureInput[],
  ): Promise<number>;

  abstract getSubscriptionFeatures(subscriptionId: string): Promise<
    Array<{
      id: number;
      code: FeatureCodeEnum;
      name: string;
      description: string | null;
      limit: number;
    }>
  >;
}
