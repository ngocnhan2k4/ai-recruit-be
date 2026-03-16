import {
  pgTable,
  timestamp,
  varchar,
  uuid,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

import { users } from "./user.model";
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
    orgInvitationId?: string;
    avatarUrl?: string;
  }>(),

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
