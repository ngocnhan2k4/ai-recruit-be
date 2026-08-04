import {
  ISubscriptionRepository,
  Subscription,
  UpsertSubscriptionFeatureInput,
} from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import {
  features,
  subscriptionFeatures,
  subscriptions,
  userFeatureUsages,
  userSubscriptions,
} from "../models";
import { PaginatedResult } from "@/common/types";
import {
  and,
  count,
  desc,
  ilike,
  inArray,
  isNull,
  SQL,
  sql,
} from "drizzle-orm";
import {
  GetListSubscriptionResponse,
  SubscriptionFilter,
} from "@/core/entities";
import { eq } from "drizzle-orm";
import { UserSubscriptionStatusEnum } from "@/core/entities";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { cacheWithDedup } from "@/common/utils";
import type { FeatureCodeEnum } from "@/core";
import { CACHE_KEYS, LONG_TTL } from "@/common/constants";
import type { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

@Injectable()
export class SubscriptionRepository
  extends GenericRepository<Subscription, typeof subscriptions>
  implements ISubscriptionRepository
{
  private readonly logger = new Logger(SubscriptionRepository.name);
  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(db, subscriptions);
  }

  async update(
    where: Partial<Subscription>,
    item: Partial<Subscription>,
    tx?: DBDrizzleTransaction,
  ): Promise<Subscription[]> {
    const updated = await super.update(where, item, tx);
    const keys: string[] = [];
    for (const subscription of updated) {
      const keyGet = CACHE_KEYS.subscription.getFeatures(subscription.id);
      keys.push(keyGet);
    }
    await this.cacheManager
      .mdel(keys)
      .catch((err) =>
        this.logger.warn(
          `[cache] Failed to invalidate cache for Subscription ${keys.join(",")}:`,
          err,
        ),
      );
    return updated;
  }

  async delete(
    where: Partial<Subscription>,
    tx?: DBDrizzleTransaction,
  ): Promise<Subscription[]> {
    const deleted = await super.delete(where, tx);
    const keys: string[] = [];
    for (const subscription of deleted) {
      const keyGet = CACHE_KEYS.subscription.getFeatures(subscription.id);
      keys.push(keyGet);
    }
    await this.cacheManager
      .mdel(keys)
      .catch((err) =>
        this.logger.warn(
          `[cache] Failed to invalidate cache for Subscription ${keys.join(",")}:`,
          err,
        ),
      );
    return deleted;
  }

  async getListSubscriptions(
    query: SubscriptionFilter,
  ): Promise<PaginatedResult<GetListSubscriptionResponse>> {
    const limit = query.limit ?? 10;
    const page = query.page ?? 1;
    const keyword = query.keyword ?? "";
    const offset = (page - 1) * limit;
    const fields = query.fields || [];

    const whereConditions: SQL[] = [isNull(subscriptions.deletedAt)];
    if (keyword) {
      whereConditions.push(ilike(subscriptions.name, `%${keyword}%`));
    }
    if (query.exactName) {
      whereConditions.push(eq(subscriptions.name, query.exactName));
    }
    if (query.isActive !== undefined) {
      whereConditions.push(eq(subscriptions.isActive, query.isActive));
    }

    const selectedField = {
      id: subscriptions.id,
      name: subscriptions.name,
      price: subscriptions.price,
      billingCycle: subscriptions.billingCycle,
      isActive: subscriptions.isActive,
      createdAt: subscriptions.createdAt,
      updatedAt: subscriptions.updatedAt,
    };
    if (fields.includes("features")) {
      selectedField["features"] = sql`
            COALESCE(
              json_agg(
                json_build_object(
                  'id', ${features.id},
                  'code', ${features.code},
                  'name', ${features.name},
                  'limit', ${subscriptionFeatures.limit}
                )
              ) FILTER (WHERE ${features.id} IS NOT NULL),
              '[]'
            )
          `.as("features");
    }
    let dbCtx: any = this.db.select(selectedField).from(subscriptions);

    if (fields.includes("features")) {
      dbCtx = dbCtx
        .leftJoin(
          subscriptionFeatures,
          eq(subscriptions.id, subscriptionFeatures.subscriptionId),
        )
        .leftJoin(features, eq(subscriptionFeatures.featureId, features.id))
        .groupBy(subscriptions.id);
    }

    const [items, totalRow] = await Promise.all([
      dbCtx
        .where(and(...whereConditions))
        .orderBy(desc(subscriptions.createdAt))
        .limit(limit)
        .offset(offset),
      !query.skipCount
        ? this.db
            .select({ count: count(subscriptions.id) })
            .from(subscriptions)
            .where(and(...whereConditions))
        : Promise.resolve([]),
    ]);

    const total = Number(totalRow?.[0]?.count ?? 0);
    const hasNext = offset + items.length < total;

    return {
      data: items,
      pagination: {
        hasNextPage: hasNext,
        total,
      },
    } as PaginatedResult<GetListSubscriptionResponse>;
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

    await this.cacheManager.del(
      CACHE_KEYS.subscription.getFeatures(subscriptionId),
    );

    return result.length;
  }

  async deleteSubscriptionFeature(
    subscriptionId: string,
    featureId: number,
  ): Promise<number> {
    return this.db.transaction(async (tx) => {
      const activeUsers = await tx
        .select({ userId: userSubscriptions.userId })
        .from(userSubscriptions)
        .where(
          and(
            eq(userSubscriptions.subscriptionId, subscriptionId),
            eq(userSubscriptions.status, UserSubscriptionStatusEnum.ACTIVE),
            isNull(userSubscriptions.deletedAt),
          ),
        );

      if (activeUsers.length > 0) {
        const userIds = activeUsers.map((u) => u.userId);
        await tx
          .delete(userFeatureUsages)
          .where(
            and(
              inArray(userFeatureUsages.userId, userIds),
              eq(userFeatureUsages.featureId, featureId),
            ),
          );
      }

      const deleted = await tx
        .delete(subscriptionFeatures)
        .where(
          and(
            eq(subscriptionFeatures.subscriptionId, subscriptionId),
            eq(subscriptionFeatures.featureId, featureId),
          ),
        )
        .returning();

      await this.cacheManager.del(
        CACHE_KEYS.subscription.getFeatures(subscriptionId),
      );

      return deleted.length;
    });
  }

  async getSubscriptionFeatures(subscriptionId: string): Promise<
    Array<{
      id: number;
      code: FeatureCodeEnum;
      name: string;
      description: string | null;
      limit: number;
    }>
  > {
    const cacheKey = CACHE_KEYS.subscription.getFeatures(subscriptionId);

    return cacheWithDedup(
      cacheKey,
      () =>
        this.cacheManager.get<
          | Array<{
              id: number;
              code: FeatureCodeEnum;
              name: string;
              description: string | null;
              limit: number;
            }>
          | undefined
        >(cacheKey),
      async () => {
        const rows = await this.db
          .select({
            featureId: features.id,
            code: features.code,
            name: features.name,
            description: features.description,
            limit: subscriptionFeatures.limit,
          })
          .from(subscriptionFeatures)
          .innerJoin(features, eq(features.id, subscriptionFeatures.featureId))
          .where(
            and(
              eq(subscriptionFeatures.subscriptionId, subscriptionId),
              eq(features.isActive, true),
            ),
          );

        return rows.map((r) => ({
          id: r.featureId,
          code: r.code as FeatureCodeEnum,
          name: r.name,
          description: r.description,
          limit: r.limit,
        }));
      },
      (data) => this.cacheManager.set(cacheKey, data, LONG_TTL),
    );
  }
}
