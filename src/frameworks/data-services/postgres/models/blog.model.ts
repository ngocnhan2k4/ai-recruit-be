import { sql } from "drizzle-orm";
import {
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { BlogPostSourceTypeEnum, BlogPostStatusEnum } from "./enums";
import { timestamps } from "./helpers";
import { skills } from "./skill.model";
import { users } from "./user.model";

export const blogPosts = pgTable(
  "blog_posts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    slug: varchar("slug", { length: 255 }).notNull().unique(),
    summary: text("summary").notNull(),
    thumbnail: varchar("thumbnail", { length: 255 }),
    content: text("content").notNull(),
    status: BlogPostStatusEnum("status").notNull().default("DRAFT"),
    sourceType: BlogPostSourceTypeEnum("source_type").notNull().default("USER"),
    source: jsonb("source"),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => blogCategories.id),
    authorId: uuid("author_id").references(() => users.id),
    viewCount: integer("view_count").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("idx_blog_posts_status").on(table.status),
    index("idx_blog_posts_source_type").on(table.sourceType),
    index("idx_blog_posts_category").on(table.categoryId),
    index("idx_blog_posts_author").on(table.authorId),
    index("idx_blog_posts_created_at").on(table.createdAt),
  ],
);

export const blogCategories = pgTable("blog_categories", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: varchar("name", { length: 50 }).notNull().unique(),
  description: text("description"),
  ...timestamps,
});

export const tags = pgTable(
  "tags",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 100 }).notNull(),
    slug: varchar("slug", { length: 100 }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_tags_name_unique").on(table.name),
    uniqueIndex("idx_tags_slug_unique").on(table.slug),
  ],
);

export const blogPostTags = pgTable(
  "blog_post_tags",
  {
    postId: uuid("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id").references(() => tags.id, {
      onDelete: "cascade",
    }),
    skillId: uuid("skill_id").references(() => skills.id, {
      onDelete: "cascade",
    }),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_blog_post_tags_post_tag_unique")
      .on(table.postId, table.tagId)
      .where(sql`${table.tagId} IS NOT NULL`),
    uniqueIndex("idx_blog_post_tags_post_skill_unique")
      .on(table.postId, table.skillId)
      .where(sql`${table.skillId} IS NOT NULL`),
    index("idx_blog_post_tags_post_id").on(table.postId),
    index("idx_blog_post_tags_tag_id").on(table.tagId),
    index("idx_blog_post_tags_skill_id").on(table.skillId),
  ],
);
