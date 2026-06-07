import { pgTable, varchar, uuid, text, jsonb } from "drizzle-orm/pg-core";
import { users } from "./user.model";
import { timestamps } from "./helpers";
import { FeedbackStatusEnum, FeedbackTypeEnum } from "./enums";
import { index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const feedbacks = pgTable(
  "feedbacks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: FeedbackStatusEnum("status").notNull().default("pending"),
    type: FeedbackTypeEnum("type").notNull().default("feedback"),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    name: varchar("name", { length: 255 }).notNull(),
    email: varchar("email", { length: 255 }),
    subject: varchar("subject", { length: 500 }).notNull(),
    message: text("message").notNull(),

    images: text("images").array(),

    metadata: jsonb("metadata").$type<Record<string, unknown>>(),

    ...timestamps,
  },
  (table) => [
    index("idx_feedbacks_assigned_created").on(
      table.assignedToUserId,
      table.createdAt.desc(),
    ),

    index("idx_feedbacks_active")
      .on(table.assignedToUserId, table.status, table.createdAt.desc())
      .where(sql`deleted_at IS NULL`),

    index("idx_feedbacks_created_at").on(table.createdAt.desc()),

    index("idx_feedbacks_user_survey_key").on(
      table.userId,
      sql`(metadata->>'surveyKey')`,
    ),
  ],
);
