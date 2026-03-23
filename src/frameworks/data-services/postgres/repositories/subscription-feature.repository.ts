import { SubscriptionFeature } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { subscriptionFeatures } from "../models";
import { ISubscriptionFeatureRepository } from "@/core/abstracts/repositories/subscription-feature-repository.abstract";

@Injectable()
export class SubscriptionFeatureRepository
  extends GenericRepository<SubscriptionFeature, typeof subscriptionFeatures>
  implements ISubscriptionFeatureRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, subscriptionFeatures);
  }
}
