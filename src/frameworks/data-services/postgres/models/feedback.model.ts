import { pgTable, varchar, uuid, text } from "drizzle-orm/pg-core";
import { users } from "./user.model";
import { timestamps } from "./helpers";
import { FeedbackStatusEnum } from "./enums";
import { index } from "drizzle-orm/pg-core";

export const feedbacks = pgTable(
  "feedbacks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: FeedbackStatusEnum("status").notNull().default("pending"),
    userId: uuid("user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    assignedToUserId: uuid("assigned_to_user_id").references(() => users.id, {
      onDelete: "set null",
    }),

    name: varchar("name", { length: 255 }).notNull(),
    subject: varchar("subject", { length: 500 }).notNull(),
    message: text("message").notNull(),

    images: text("images").array(),

    ...timestamps,
  },
  (table) => [
    index("idx_feedbacks_user_status_created").on(
      table.userId,
      table.status,
      table.createdAt,
    ),
  ],
);
