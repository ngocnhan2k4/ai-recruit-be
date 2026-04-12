import { ONE_DAY_MS, RESPONSE_CODE } from "@/common/constants";
import { FeatureCodeEnum, IUserFeatureUsageRepository } from "@/core";
import { Injectable, Logger } from "@nestjs/common";
import { ForbiddenException } from "@nestjs/common";

@Injectable()
export class FeatureService {
  private readonly logger = new Logger(FeatureService.name);
  constructor(
    private readonly userFeatureUsageRepository: IUserFeatureUsageRepository,
  ) {}

  async consumeFeature(
    userId: string,
    featureCode: FeatureCodeEnum,
    amount?: number,
  ): Promise<void> {
    const consumeAmount = amount ?? 1;

    const result = await this.userFeatureUsageRepository.getConsumeFeatureUsage(
      userId,
      featureCode,
    );

    if (!result) {
      throw new ForbiddenException({
        message: "Feature or subscription not available",
        code: RESPONSE_CODE.FEATURE_OR_SUBSCRIPTION_NOT_AVAILABLE,
      });
    }

    const { featureId, subscriptionId, limit, expiredAt } = result;

    if (!subscriptionId) {
      throw new ForbiddenException({
        message: "No subscription",
        code: RESPONSE_CODE.NO_SUBSCRIPTION,
      });
    }

    if (!featureId) {
      throw new ForbiddenException({
        message: "Feature not available",
        code: RESPONSE_CODE.FEATURE_NOT_AVAILABLE,
      });
    }

    if (expiredAt && new Date(expiredAt).getTime() <= Date.now()) {
      throw new ForbiddenException({
        message: "Subscription has expired",
        code: RESPONSE_CODE.SUBSCRIPTION_EXPIRED,
      });
    }

    if ((limit ?? 0) <= 0) {
      throw new ForbiddenException({
        message: "Feature not included in subscription",
        code: RESPONSE_CODE.FEATURE_NOT_INCLUDED_IN_SUBSCRIPTION,
      });
    }

    const now = new Date();
    await this.userFeatureUsageRepository.executeWithTransaction(async () => {
      if (result.usage == null) {
        await this.userFeatureUsageRepository.createIfNotExists(
          userId,
          featureId,
          now,
        );
      }

      const refilled =
        await this.userFeatureUsageRepository.tryRefillAndConsume(
          userId,
          featureId,
          consumeAmount,
          now,
        );
      if (refilled) return;

      const consumed =
        await this.userFeatureUsageRepository.tryConsumeWithinLimit(
          userId,
          featureId,
          consumeAmount,
          limit,
          now,
        );
      if (consumed) return;

      const lastRefillAt =
        await this.userFeatureUsageRepository.getLastRefillAt(
          userId,
          featureId,
        );

      const nextRefillAt = new Date(
        (lastRefillAt?.getTime() ?? 0) + ONE_DAY_MS,
      );
      const seconds = Math.max(
        0,
        Math.ceil((nextRefillAt.getTime() - now.getTime()) / 1000),
      );

      throw new ForbiddenException(`Quota exceeded. Try again in ${seconds}s`);
    });
  }
}
