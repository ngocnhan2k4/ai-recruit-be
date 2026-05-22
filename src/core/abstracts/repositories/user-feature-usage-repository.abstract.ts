import type {
  FeatureCodeEnum,
  GetUserFeaturesResponse,
  UserFeatureUsage,
} from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class IUserFeatureUsageRepository extends IGenericRepository<UserFeatureUsage> {
  abstract getUserFeatures(userId: string): Promise<GetUserFeaturesResponse>;

  abstract getConsumeFeatureUsage(
    userId: string,
    featureCode: FeatureCodeEnum,
  ): Promise<{
    featureId: number;
    subscriptionId: string | null;
    expiredAt: Date | null;
    limit: number;
    usage: number | null;
  }>;

  abstract createIfNotExists(
    userId: string,
    featureId: number,
    now: Date,
  ): Promise<void>;

  abstract tryRefillAndConsume(
    userId: string,
    featureId: number,
    amount: number,
    now: Date,
  ): Promise<boolean>;

  abstract tryConsumeWithinLimit(
    userId: string,
    featureId: number,
    amount: number,
    limit: number,
    now: Date,
  ): Promise<boolean>;

  abstract getLastRefillAt(
    userId: string,
    featureId: number,
  ): Promise<Date | null>;

  abstract refillExpiredFeatureUsages(
    userId: string,
    featureIds: number[],
    now: Date,
  ): Promise<number>;

  abstract releaseUsage(
    userId: string,
    featureId: number,
    amount: number,
    now: Date,
  ): Promise<void>;
}
