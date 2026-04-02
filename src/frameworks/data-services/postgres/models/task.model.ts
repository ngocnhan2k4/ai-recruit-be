import { index, jsonb, text, varchar } from "drizzle-orm/pg-core";
import { integer, pgTable, uuid } from "drizzle-orm/pg-core";
import { TaskStatusEnum, TaskTypeEnum } from "./enums";
import { timestamps } from "./helpers";
import { users } from "./user.model";

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(),

    input: jsonb("input").notNull(),
    result: jsonb("result"),
    error: text("error"),

    status: TaskStatusEnum("status").notNull().default("pending"),
    type: TaskTypeEnum("type").notNull(),

    progress: integer("progress").notNull().default(0),

    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    index("idx_tasks_type_status").on(table.type, table.status),
    index("idx_tasks_user_id").on(table.userId),
  ],
);
