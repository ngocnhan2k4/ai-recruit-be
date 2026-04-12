import { Injectable } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import {
  features,
  subscriptionFeatures,
  subscriptions,
  userFeatureUsages,
  userSubscriptions,
} from "../models";
import { and, desc, eq, inArray, isNull, or, sql } from "drizzle-orm";
import {
  FeatureCodeEnum,
  UserFeatureUsage,
  UserSubscriptionStatusEnum,
} from "@/core";
import { IUserFeatureUsageRepository } from "@/core/abstracts/repositories/user-feature-usage-repository.abstract";
import { GenericRepository } from "./generic-repository";
import { ONE_DAY_MS } from "@/common/constants";
import { ISubscriptionRepository } from "@/core";

@Injectable()
export class UserFeatureUsageRepository
  extends GenericRepository<UserFeatureUsage, typeof userFeatureUsages>
  implements IUserFeatureUsageRepository
{
  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    private readonly subscriptionRepository: ISubscriptionRepository,
  ) {
    super(db, userFeatureUsages);
  }

  async getUserFeatures(userId: string) {
    const [subscriptionRow] = await this.db
      .select({
        subscriptionId: subscriptions.id,
        subscriptionName: subscriptions.name,
        billingCycle: subscriptions.billingCycle,
        subscriptionStatus: userSubscriptions.status,
        expiredAt: userSubscriptions.expiredAt,
        startedAt: userSubscriptions.startedAt,
      })
      .from(userSubscriptions)
      .innerJoin(
        subscriptions,
        eq(subscriptions.id, userSubscriptions.subscriptionId),
      )
      .where(
        and(
          eq(userSubscriptions.userId, userId),
          eq(subscriptions.isActive, true),
        ),
      )
      .orderBy(desc(userSubscriptions.startedAt))
      .limit(1);

    if (!subscriptionRow) {
      return {
        subscription: null,
        features: [],
      };
    }

    const currentSubscription = {
      id: subscriptionRow.subscriptionId,
      name: subscriptionRow.subscriptionName,
      billingCycle: subscriptionRow.billingCycle,
      status: subscriptionRow.subscriptionStatus as UserSubscriptionStatusEnum,
      expiredAt: subscriptionRow.expiredAt,
      startedAt: subscriptionRow.startedAt,
    };

    const featureSnapshots =
      await this.subscriptionRepository.getSubscriptionFeatures(
        currentSubscription.id,
      );

    if (!featureSnapshots.length) {
      return {
        subscription: currentSubscription,
        features: [],
      };
    }

    const featureIds = featureSnapshots.map((f) => f.id);
    const usageRows = await this.db
      .select({
        featureId: userFeatureUsages.featureId,
        usage: userFeatureUsages.usage,
        lastRefillAt: userFeatureUsages.lastRefillAt,
      })
      .from(userFeatureUsages)
      .where(
        and(
          eq(userFeatureUsages.userId, userId),
          inArray(userFeatureUsages.featureId, featureIds),
        ),
      );

    const usageMap = new Map<
      number,
      { usage: number; lastRefillAt: Date | null }
    >();
    for (const row of usageRows) {
      usageMap.set(row.featureId, {
        usage: row.usage ?? 0,
        lastRefillAt: row.lastRefillAt ?? null,
      });
    }

    return {
      subscription: currentSubscription,
      features: featureSnapshots.map((f) => {
        const usage = usageMap.get(f.id);
        return {
          id: f.id,
          code: f.code,
          name: f.name,
          description: f.description,
          limit: f.limit,
          usage: usage?.usage ?? 0,
          lastRefillAt: usage?.lastRefillAt ?? null,
        };
      }),
    };
  }

  async getConsumeFeatureUsage(userId: string, featureCode: FeatureCodeEnum) {
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
          eq(subscriptions.isActive, true),
        ),
      )
      .orderBy(desc(userSubscriptions.startedAt))
      .limit(1);

    return result;
  }

  async createIfNotExists(
    userId: string,
    featureId: number,
    now: Date,
  ): Promise<void> {
    const dbClient = this.getExecutor();

    await dbClient
      .insert(userFeatureUsages)
      .values({
        userId,
        featureId,
        usage: 0,
        lastRefillAt: now,
      })
      .onConflictDoNothing();
  }

  async tryRefillAndConsume(
    userId: string,
    featureId: number,
    amount: number,
    now: Date,
  ): Promise<boolean> {
    const dbClient = this.getExecutor();

    const refill = await dbClient
      .update(userFeatureUsages)
      .set({
        usage: amount,
        lastRefillAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(userFeatureUsages.userId, userId),
          eq(userFeatureUsages.featureId, featureId),
          sql`${userFeatureUsages.lastRefillAt} <= ${new Date(
            now.getTime() - ONE_DAY_MS,
          )}`,
        ),
      )
      .returning({ usage: userFeatureUsages.usage });

    return refill.length > 0;
  }

  async tryConsumeWithinLimit(
    userId: string,
    featureId: number,
    amount: number,
    limit: number,
    now: Date,
  ): Promise<boolean> {
    const dbClient = this.getExecutor();

    const consume = await dbClient
      .update(userFeatureUsages)
      .set({
        usage: sql`${userFeatureUsages.usage} + ${amount}`,
        updatedAt: now,
      })
      .where(
        and(
          eq(userFeatureUsages.userId, userId),
          eq(userFeatureUsages.featureId, featureId),
          sql`${userFeatureUsages.usage} + ${amount} <= ${limit}`,
        ),
      )
      .returning({ usage: userFeatureUsages.usage });

    return consume.length > 0;
  }

  async getLastRefillAt(
    userId: string,
    featureId: number,
  ): Promise<Date | null> {
    const dbClient = this.getExecutor();

    const [row] = await dbClient
      .select({ lastRefillAt: userFeatureUsages.lastRefillAt })
      .from(userFeatureUsages)
      .where(
        and(
          eq(userFeatureUsages.userId, userId),
          eq(userFeatureUsages.featureId, featureId),
        ),
      )
      .limit(1);
    return row?.lastRefillAt ?? null;
  }

  async refillExpiredFeatureUsages(
    userId: string,
    featureIds: number[],
    now: Date,
  ): Promise<number> {
    if (!featureIds.length) return 0;
    const dbClient = this.getExecutor();

    const updated = await dbClient
      .update(userFeatureUsages)
      .set({
        usage: 0,
        lastRefillAt: now,
        updatedAt: now,
      })
      .where(
        and(
          eq(userFeatureUsages.userId, userId),
          inArray(userFeatureUsages.featureId, featureIds),
          or(
            isNull(userFeatureUsages.lastRefillAt),
            sql`${userFeatureUsages.lastRefillAt} <= ${new Date(
              now.getTime() - ONE_DAY_MS,
            )}`,
          ),
        ),
      )
      .returning({ featureId: userFeatureUsages.featureId });

    return updated.length;
  }
}
