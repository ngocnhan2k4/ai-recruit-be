import { Injectable, ForbiddenException } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { DBDrizzleTransaction, type DBDrizzle } from "../types";
import {
  features,
  subscriptionFeatures,
  subscriptions,
  userFeatureUsages,
  userSubscriptions,
} from "../models";
import { and, desc, eq, sql } from "drizzle-orm";
import {
  FeatureCodeEnum,
  UserFeatureUsage,
  UserSubscriptionStatusEnum,
} from "@/core";
import { IUserFeatureUsageRepository } from "@/core/abstracts/repositories/user-feature-usage-repository.abstract";
import { GenericRepository } from "./generic-repository";
import { ONE_DAY_MS } from "@/common/constants";

@Injectable()
export class UserFeatureUsageRepository
  extends GenericRepository<UserFeatureUsage, typeof userFeatureUsages>
  implements IUserFeatureUsageRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userFeatureUsages);
  }

  async getUserFeatures(userId: string) {
    const rows = await this.db
      .select({
        featureId: features.id,
        code: features.code,
        name: features.name,
        description: features.description,
        limit: subscriptionFeatures.limit,
        usage: sql<number>`coalesce(${userFeatureUsages.usage}, 0)`,
        subscriptionId: subscriptions.id,
        subscriptionName: subscriptions.name,
        billingCycle: subscriptions.billingCycle,
        subscriptionStatus: userSubscriptions.status,
        expiredAt: userSubscriptions.expiredAt,
        startedAt: userSubscriptions.startedAt,
      })
      .from(userSubscriptions)
      .innerJoin(
        subscriptionFeatures,
        eq(
          subscriptionFeatures.subscriptionId,
          userSubscriptions.subscriptionId,
        ),
      )
      .innerJoin(
        subscriptions,
        eq(subscriptions.id, userSubscriptions.subscriptionId),
      )
      .innerJoin(features, eq(features.id, subscriptionFeatures.featureId))
      .leftJoin(
        userFeatureUsages,
        and(
          eq(userFeatureUsages.userId, userId),
          eq(userFeatureUsages.featureId, features.id),
        ),
      )
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(subscriptions.isActive, true),
          eq(features.isActive, true),
        ),
      )
      .orderBy(desc(userSubscriptions.startedAt));

    if (!rows.length) {
      return {
        subscription: null,
        features: [],
      };
    }

    const latestSubscriptionId = rows[0].subscriptionId;

    const filteredRows = rows.filter(
      (row) => row.subscriptionId === latestSubscriptionId,
    );

    const currentSubscription = {
      id: filteredRows[0].subscriptionId,
      name: filteredRows[0].subscriptionName,
      billingCycle: filteredRows[0].billingCycle,
      status: filteredRows[0].subscriptionStatus as UserSubscriptionStatusEnum,
      expiredAt: filteredRows[0].expiredAt,
      startedAt: filteredRows[0].startedAt,
    };

    return {
      subscription: currentSubscription,
      features: filteredRows.map((row) => ({
        id: row.featureId,
        code: row.code as FeatureCodeEnum,
        name: row.name,
        description: row.description,
        limit: row.limit,
        usage: row.usage ?? 0,
      })),
    };
  }

  // [TODO] Using redis to enhance performance
  async consumeFeature(
    userId: string,
    featureCode: FeatureCodeEnum,
    amount = 1,
    tx?: DBDrizzleTransaction,
  ): Promise<{ limit: number; usage: number }> {
    // 1) Get feature, subscription data
    const [result] = await this.db
      .select({
        featureId: features.id,
        subscriptionId: userSubscriptions.subscriptionId,
        expiredAt: userSubscriptions.expiredAt,
        limit: subscriptionFeatures.limit,
        usage: userFeatureUsages.usage,
      })
      .from(features)
      .innerJoin(
        subscriptionFeatures,
        eq(subscriptionFeatures.featureId, features.id),
      )
      .innerJoin(
        userSubscriptions,
        eq(
          userSubscriptions.subscriptionId,
          subscriptionFeatures.subscriptionId,
        ),
      )
      .innerJoin(
        subscriptions,
        eq(userSubscriptions.subscriptionId, subscriptions.id),
      )
      .leftJoin(
        userFeatureUsages,
        and(
          eq(userFeatureUsages.userId, userId),
          eq(userFeatureUsages.featureId, features.id),
        ),
      )
      .where(
        and(
          eq(features.code, featureCode),
          eq(features.isActive, true),

          eq(userSubscriptions.userId, userId),
          eq(userSubscriptions.status, UserSubscriptionStatusEnum.ACTIVE),
          sql`(${userSubscriptions.expiredAt} IS NULL OR ${userSubscriptions.expiredAt} > now())`,

          eq(subscriptions.isActive, true),
        ),
      )
      .orderBy(desc(userSubscriptions.startedAt))
      .limit(1);

    // 2. Validate
    if (!result) {
      throw new ForbiddenException("Feature or subscription not available");
    }

    const { featureId, subscriptionId, limit } = result;

    if (!featureId) {
      throw new ForbiddenException("Feature not available");
    }

    if (!subscriptionId) {
      throw new ForbiddenException("No active subscription");
    }

    if ((limit ?? 0) <= 0) {
      throw new ForbiddenException("Feature not included in subscription");
    }

    // Support both usecase use transaction or not
    if (tx) {
      return this._consumeFeatureInternal(tx, {
        ...result,
        userId,
        amount,
      });
    } else {
      return this.db.transaction(async (tx) =>
        this._consumeFeatureInternal(tx, {
          ...result,
          userId,
          amount,
        }),
      );
    }
  }

  private async _consumeFeatureInternal(
    ctx: DBDrizzle | DBDrizzleTransaction,
    data: {
      featureId: number;
      subscriptionId: string;
      expiredAt: Date | null;
      limit: number;
      usage: number | null;
      userId: string;
      amount: number;
    },
  ) {
    const now = new Date();
    const { featureId, limit } = data;

    // 3. Nếu chưa có record → create mới
    if (data.usage == null) {
      await ctx
        .insert(userFeatureUsages)
        .values({
          userId: data.userId,
          featureId,
          usage: 0,
          lastRefillAt: now,
        })
        .onConflictDoNothing();
    }

    // 4. Nếu đã qua 1 ngày → refill + consume
    const refill = await ctx
      .update(userFeatureUsages)
      .set({
        usage: data.amount,
        lastRefillAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(userFeatureUsages.userId, data.userId),
          eq(userFeatureUsages.featureId, featureId),
          sql`${userFeatureUsages.lastRefillAt} <= ${new Date(
            now.getTime() - ONE_DAY_MS,
          )}`,
        ),
      )
      .returning({
        usage: userFeatureUsages.usage,
      });

    if (refill.length > 0) {
      return { limit, usage: data.amount };
    }

    // 5. Update usage with no race condition
    const consume = await ctx
      .update(userFeatureUsages)
      .set({
        usage: sql`${userFeatureUsages.usage} + ${data.amount}`,
        updatedAt: now,
      })
      .where(
        and(
          eq(userFeatureUsages.userId, data.userId),
          eq(userFeatureUsages.featureId, featureId),
          sql`${userFeatureUsages.usage} + ${data.amount} <= ${limit}`,
        ),
      )
      .returning({
        usage: userFeatureUsages.usage,
      });

    if (consume.length > 0) {
      return {
        limit,
        usage: consume[0].usage,
      };
    }

    // 6. Hết quota → trả thời gian còn lại
    const [row] = await ctx
      .select({
        lastRefillAt: userFeatureUsages.lastRefillAt,
      })
      .from(userFeatureUsages)
      .where(
        and(
          eq(userFeatureUsages.userId, data.userId),
          eq(userFeatureUsages.featureId, featureId),
        ),
      )
      .limit(1);

    const nextRefillAt = new Date(
      (row?.lastRefillAt?.getTime() ?? 0) + ONE_DAY_MS,
    );
    const seconds = Math.max(
      0,
      Math.ceil((nextRefillAt.getTime() - now.getTime()) / 1000),
    );

    throw new ForbiddenException(`Quota exceeded. Try again in ${seconds}s`);
  }
}
