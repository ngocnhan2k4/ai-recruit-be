import {
  pgTable,
  timestamp,
  varchar,
  uuid,
  pgEnum,
  jsonb,
} from "drizzle-orm/pg-core";

import { users } from "./user.model";
import { companies } from "./company.model";
import { NotificationTypeEnum } from "./enums";
import { organizations } from "./organization.model";

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  senderId: uuid("sender_id").references(() => users.id, {
    onDelete: "set null",
  }),

  title: varchar("title").notNull(),
  message: varchar("message", { length: 500 }).notNull(),
  type: NotificationTypeEnum("type").notNull(),

  payload: jsonb("payload").$type<{
    jobId?: string;
    orgId?: string;
    userId?: string;
    applyId?: string;
  }>(),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const userNotifications = pgTable("user_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),

  notificationId: uuid("notification_id")
    .notNull()
    .references(() => notifications.id, { onDelete: "cascade" }),

  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),

  organizationId: uuid("organization_id").references(() => organizations.id, {
    onDelete: "set null",
  }),

  readAt: timestamp("read_at"),
  deletedAt: timestamp("deleted_at"),
});
