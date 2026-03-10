import {
  bigserial,
  boolean,
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
  UserSubscriptionStatusEnum,
} from "./enums";

export const features = pgTable("features", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  code: varchar("code", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  price: numeric("price", { precision: 12, scale: 2 }).notNull(),
  billingCycle: BillingCycleSubscriptionEnum("billing_cycle")
    .notNull()
    .default("monthly"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});

export const subscriptionFeatures = pgTable("subscription_features", {
  subscriptionId: uuid("subscription_id")
    .notNull()
    .references(() => subscriptions.id),
  featureId: bigserial("feature_id", { mode: "number" })
    .notNull()
    .references(() => features.id),
  limit: integer("limit").notNull().default(0),
});

export const userSubscriptions = pgTable("user_subscriptions", {
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
});

export const user_feature_usages = pgTable("user_feature_usages", {
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  featureId: bigserial("feature_id", { mode: "number" })
    .notNull()
    .references(() => features.id),
  usage: integer("usage").notNull().default(0),
  ...timestamps,
});
