import {
  bigserial,
  boolean,
  index,
  integer,
  numeric,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { text } from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";
import { users } from "./user.model";
import {
  BillingCycleSubscriptionEnum,
  FeatureCodeEnum,
  SubscriptionEnum,
  UserSubscriptionStatusEnum,
} from "./enums";
import { primaryKey } from "drizzle-orm/pg-core";
import { uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const features = pgTable(
  "features",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    code: FeatureCodeEnum("code").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [uniqueIndex("features_code_unique").on(table.code)],
);

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    name: SubscriptionEnum("code").notNull(),
    price: numeric("price", { precision: 12, scale: 2 }).notNull(),
    billingCycle: BillingCycleSubscriptionEnum("billing_cycle")
      .notNull()
      .default("monthly"),
    isActive: boolean("is_active").notNull().default(true),
    ...timestamps,
  },
  (table) => [uniqueIndex("features_code_name").on(table.name)],
);

export const subscriptionFeatures = pgTable(
  "subscription_features",
  {
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id),
    featureId: bigserial("feature_id", { mode: "number" })
      .notNull()
      .references(() => features.id),
    limit: integer("limit").notNull().default(0),
  },
  (table) => [
    primaryKey({
      columns: [table.subscriptionId, table.featureId],
    }),
  ],
);

export const userSubscriptions = pgTable(
  "user_subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    subscriptionId: uuid("subscription_id")
      .notNull()
      .references(() => subscriptions.id),
    startedAt: timestamp("started_at").notNull().defaultNow(),
    expiredAt: timestamp("expired_at"),
    status: UserSubscriptionStatusEnum("status").notNull().default("active"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("unique_active_subscription_per_user")
      .on(table.userId)
      .where(sql`${table.status} = 'active'`),
    index("user_subscriptions_user_status_idx").on(table.userId, table.status),
    index("user_subscriptions_user_idx").on(table.userId),
    index("user_subscriptions_subscription_idx").on(table.subscriptionId),
  ],
);

export const userFeatureUsages = pgTable(
  "user_feature_usages",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    featureId: bigserial("feature_id", { mode: "number" })
      .notNull()
      .references(() => features.id),
    usage: integer("usage").notNull().default(0),
    lastRefillAt: timestamp("last_refill_at"),
    ...timestamps,
  },
  (table) => [
    primaryKey({
      columns: [table.userId, table.featureId],
    }),
    index("user_feature_usages_feature_idx").on(table.featureId),
  ],
);
