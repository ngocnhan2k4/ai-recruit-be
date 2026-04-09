import {
  index,
  integer,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { skills } from "./skill.model";
import { users } from "./user.model";
import { timestamps } from "./helpers";
import { blogPostStatusEnum } from "./enums";

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    summary: text("summary").notNull(),
    thumbnail: varchar("thumbnail", { length: 255 }),
    content: text("content").notNull(),
    status: blogPostStatusEnum("status").notNull().default("DRAFT"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => blogCategories.id),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    viewCount: integer("view_count").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("idx_blog_posts_slug").on(table.slug),
    index("idx_blog_posts_status").on(table.status),
    index("idx_blog_posts_category").on(table.categoryId),
    index("idx_blog_posts_author").on(table.authorId),
    index("idx_blog_posts_created_at").on(table.createdAt),
  ],
);

export const blogCategories = pgTable(
  "blog_categories",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 50 }).notNull().unique(),
    description: text("description"),
    ...timestamps,
  },
  (table) => [index("idx_blog_categories_name").on(table.name)],
);

export const blogComments = pgTable(
  "blog_comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    content: text("content").notNull(),
    parentCommentId: uuid("parent_comment_id").references(
      () => blogComments.id,
      {
        onDelete: "cascade",
      },
    ),
    ...timestamps,
  },
  (table) => [
    index("idx_blog_comments_parent_comment_id").on(table.parentCommentId),
    index("idx_blog_comments_post_id").on(table.postId),
    index("idx_blog_comments_author_id").on(table.authorId),
  ],
);

export const blogLikes = pgTable(
  "blog_likes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_blog_likes_post_user").on(table.postId, table.userId),
  ],
);

export const blogTags = pgTable(
  "blog_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_blog_tags_name_unique").on(table.name),
    uniqueIndex("idx_blog_tags_slug_unique").on(table.slug),
    index("idx_blog_tags_name").on(table.name),
    index("idx_blog_tags_slug").on(table.slug),
  ],
);

export const blogPostTags = pgTable(
  "blog_post_tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").references(() => blogTags.id, {
      onDelete: "cascade",
    }),
    skillId: uuid("skill_id").references(() => skills.id, {
      onDelete: "cascade",
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_blog_post_tags_unique").on(
      table.postId,
      table.tagId,
      table.skillId,
    ),
    index("idx_blog_post_tags_post_id").on(table.postId),
    index("idx_blog_post_tags_tag_id").on(table.tagId),
    index("idx_blog_post_tags_skill_id").on(table.skillId),
  ],
);

export const blogSavedPosts = pgTable(
  "blog_saved_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_blog_saved_posts_unique").on(table.postId, table.userId),
    index("idx_blog_saved_posts_post_id").on(table.postId),
    index("idx_blog_saved_posts_user_id").on(table.userId),
  ],
);
