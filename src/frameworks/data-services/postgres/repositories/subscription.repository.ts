import {
  ISubscriptionRepository,
  Subscription,
  UpsertSubscriptionFeatureInput,
  UserSubscription,
} from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import {
  subscriptionFeatures,
  subscriptions,
  userSubscriptions,
} from "../models";
import { PaginatedResult } from "@/common/types";
import { and, count, ilike, isNull, SQL, sql } from "drizzle-orm";
import {
  SubscriptionFilter,
  UserSubscriptionFilter,
} from "@/core/entities/subscription.entity";
import { eq } from "drizzle-orm";

@Injectable()
export class SubscriptionRepository
  extends GenericRepository<Subscription, typeof subscriptions>
  implements ISubscriptionRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, subscriptions);
  }

  async getListSubscriptions(
    query: SubscriptionFilter,
  ): Promise<PaginatedResult<Subscription>> {
    const limit = query.limit ?? 10;
    const page = query.page ?? 1;
    const keyword = query.keyword ?? "";
    const offset = (page - 1) * limit;

    const whereConditions: SQL[] = [isNull(subscriptions.deletedAt)];
    if (keyword) {
      whereConditions.push(ilike(subscriptions.name, `%${keyword}%`));
    }

    const [items, totalRow] = await Promise.all([
      this.db
        .select()
        .from(subscriptions)
        .where(and(...whereConditions))
        .limit(limit)
        .offset(offset),
      !query.skipCount
        ? this.db
            .select({ count: count(subscriptions.id) })
            .from(subscriptions)
            .where(and(...whereConditions))
        : Promise.resolve(),
    ]);

    const total = Number(totalRow[0]?.count ?? 0);
    const hasNext = offset + items.length < total;

    return {
      data: items,
      pagination: {
        hasNextPage: hasNext,
        total,
      },
    } as PaginatedResult<Subscription>;
  }

  async upsertSubscriptionFeatures(
    subscriptionId: string,
    items: UpsertSubscriptionFeatureInput[],
  ): Promise<number> {
    if (!items.length) return 0;

    const values = items.map((i) => ({
      subscriptionId,
      featureId: i.featureId,
      limit: i.limit,
    }));

    const result = await this.db
      .insert(subscriptionFeatures)
      .values(values)
      .onConflictDoUpdate({
        target: [
          subscriptionFeatures.subscriptionId,
          subscriptionFeatures.featureId,
        ],
        set: { limit: sql`excluded.limit` },
      })
      .returning();

    return result.length;
  }

  async getListUserSubscriptions(
    query: UserSubscriptionFilter,
  ): Promise<PaginatedResult<UserSubscription>> {
    const limit = query.limit ?? 10;
    const page = query.page ?? 1;
    const keyword = query.keyword ?? "";
    const offset = (page - 1) * limit;

    const whereConditions: SQL[] = [isNull(userSubscriptions.deletedAt)];

    if (query.userId) {
      whereConditions.push(eq(userSubscriptions.userId, query.userId));
    }

    if (query.subscriptionId) {
      whereConditions.push(
        eq(userSubscriptions.subscriptionId, query.subscriptionId),
      );
    }

    if (query.status) {
      whereConditions.push(eq(userSubscriptions.status, query.status as any));
    }

    if (keyword) {
      whereConditions.push(
        sql`(
          cast(${userSubscriptions.userId} as text) ilike ${`%${keyword}%`}
          or cast(${userSubscriptions.subscriptionId} as text) ilike ${`%${keyword}%`}
        )`,
      );
    }

    const [items, totalRow] = await Promise.all([
      this.db
        .select()
        .from(userSubscriptions)
        .where(and(...whereConditions))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ count: count(userSubscriptions.id) })
        .from(userSubscriptions)
        .where(and(...whereConditions)),
    ]);

    const total = Number(totalRow[0]?.count ?? 0);
    const hasNext = offset + items.length < total;

    return {
      data: items as UserSubscription[],
      pagination: {
        hasNextPage: hasNext,
        total,
      },
    };
  }
}
