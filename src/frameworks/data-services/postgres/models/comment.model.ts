import { commentTypeEnum } from "./enums";
import { blogPosts } from "./blog.model";
import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { users } from "./user.model";
import { organizations } from "./organization.model";
import { timestamps } from "./helpers";

export const comment = pgTable(
  "comments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    content: text("content").notNull(),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id),
    organizationId: uuid("organization_id").references(() => organizations.id),
    blogPostId: uuid("blog_post_id").references(() => blogPosts.id),
    type: commentTypeEnum("type").notNull(),
    ...timestamps,
  },
  (table) => [
    index("idx_comments_type").on(table.type),
    index("idx_comments_author").on(table.authorId),
    index("idx_comments_created_at").on(table.createdAt),
    index("idx_comments_blog_post").on(table.blogPostId),
    index("idx_comments_organization").on(table.organizationId),
  ],
);
