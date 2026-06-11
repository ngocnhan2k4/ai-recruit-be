import {
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { ActionTypeEnum, ObjectTypeEnum } from "./enums";
import { timestamps } from "./helpers";
import { users } from "./user.model";

export const comments = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    content: text("content").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    parentCommentId: uuid("parent_comment_id").references(() => comments.id, {
      onDelete: "cascade",
    }),
    objectId: uuid("object_id").notNull(),
    objectType: ObjectTypeEnum("object_type").notNull(),
    depth: integer("depth").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("idx_comments_object_user").on(
      table.objectType,
      table.objectId,
      table.authorId,
    ),
    index("idx_created_at").on(table.createdAt),
    index("idx_comments_parent_id").on(table.parentCommentId),
  ],
);

export const userActions = pgTable(
  "user_actions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    objectId: uuid("object_id").notNull(),
    objectType: ObjectTypeEnum("object_type").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: ActionTypeEnum("type").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_user_actions_unique").on(
      table.objectType,
      table.objectId,
      table.userId,
      table.type,
    ),
    index("idx_user_actions_object").on(table.objectType, table.objectId),
  ],
);
