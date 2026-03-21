import type { FeatureCodeEnum, UserFeatureUsage } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class IUserFeatureUsageRepository extends IGenericRepository<UserFeatureUsage> {
  abstract consumeFeature(
    userId: string,
    featureCode: FeatureCodeEnum,
    amount?: number,
  ): Promise<{ limit: number; usage: number }>;
}
