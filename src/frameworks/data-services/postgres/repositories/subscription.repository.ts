import {
  ISubscriptionRepository,
  Subscription,
  UpsertSubscriptionFeatureInput,
} from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { features, subscriptionFeatures, subscriptions } from "../models";
import { PaginatedResult } from "@/common/types";
import { and, count, desc, ilike, isNull, SQL, sql } from "drizzle-orm";
import {
  GetListSubscriptionResponse,
  SubscriptionFilter,
} from "@/core/entities";
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

    return result.length;
  }
}
