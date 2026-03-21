import type {
  FeatureCodeEnum,
  GetUserFeaturesResponse,
  UserFeatureUsage,
} from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class IUserFeatureUsageRepository extends IGenericRepository<UserFeatureUsage> {
  abstract getUserFeatures(userId: string): Promise<GetUserFeaturesResponse>;

  abstract consumeFeature(
    userId: string,
    featureCode: FeatureCodeEnum,
    amount?: number,
  ): Promise<{ limit: number; usage: number }>;
}
