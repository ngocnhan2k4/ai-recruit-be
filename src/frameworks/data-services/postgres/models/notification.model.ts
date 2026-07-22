import {
  pgTable,
  timestamp,
  varchar,
  uuid,
  jsonb,
  integer,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { users } from "./user.model";
import { NotificationTypeEnum } from "./enums";
import { organizations } from "./organization.model";

export type NotificationTemplateData = Record<string, any>;

export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),

  senderId: uuid("sender_id").references(() => users.id, {
    onDelete: "set null",
  }),

  title: varchar("title").notNull(),
  message: varchar("message", { length: 500 }).notNull(),
  type: NotificationTypeEnum("type").notNull(),
  templateKey: varchar("template_key", { length: 100 }),
  templateData: jsonb("template_data")
    .$type<NotificationTemplateData>()
    .notNull()
    .default(sql`'{}'::jsonb`),
  snapshotLanguageCode: varchar("snapshot_language_code", { length: 5 }),

  payload: jsonb("payload").$type<{
    jobId?: string;
    orgId?: string;
    userId?: string;
    applyId?: string;
    orgInvitationId?: string;
    avatarUrl?: string;
    taskId?: string;
    roadmapId?: string;
    feedbackId?: string;
    blogId?: string;
    blogSlug?: string;
    commentId?: string;
    commentParentId?: string | null;
  }>(),

  // Aggregation fields: track who performed the action (for "A, B and N others" style)
  actorIds: jsonb("actor_ids").$type<string[]>().default([]),
  actorCount: integer("actor_count").notNull().default(1),

  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at"),
});

export const userNotifications = pgTable(
  "user_notifications",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    notificationId: uuid("notification_id")
      .notNull()
      .references(() => notifications.id, { onDelete: "cascade" }),

    receiverId: uuid("receiver_id")
      .notNull()
      .references(() => users.id),

    organizationId: uuid("organization_id").references(() => organizations.id, {
      onDelete: "set null",
    }),

    readAt: timestamp("read_at"),
    deletedAt: timestamp("deleted_at"),
  },
  (table) => [
    index("idx_user_notifications_receiver_deleted").on(
      table.receiverId,
      table.deletedAt,
    ),
    index("idx_user_notifications_receiver_org_deleted").on(
      table.receiverId,
      table.organizationId,
      table.deletedAt,
    ),
    index("idx_user_notifications_notification").on(table.notificationId),
  ],
);
