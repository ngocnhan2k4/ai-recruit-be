import { Inject, Injectable } from "@nestjs/common";
import { GenericRepository } from "./generic-repository";
import { BlogPost, NewBlogPost, NewBlogPostTag } from "@/core";
import {
  blogCategories,
  blogPostActions,
  blogPosts,
  blogPostTags,
  blogTags,
} from "../models/blog.model";
import { IBlogRepository } from "@/core/abstracts/repositories/blog-repository.abstract";
import { type DBDrizzle, type DBDrizzleTransaction } from "../types";
import { and, asc, count, desc, eq, ilike, sql, SQL } from "drizzle-orm";
import { skills, users } from "../models";
import { PaginatedResult } from "@/common/types";
import {
  BlogLikeResult,
  BlogPostDetail,
  BlogPostFilters,
  BlogPostListItem,
} from "@/core/entities/blog.entity";

@Injectable()
export class BlogRepository
  extends GenericRepository<BlogPost, typeof blogPosts>
  implements IBlogRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, blogPosts);
  }

  async getCategories(): Promise<{ id: string; name: string }[]> {
    return this.db
      .select({
        id: blogCategories.id,
        name: blogCategories.name,
      })
      .from(blogCategories)
      .orderBy(asc(blogCategories.name));
  }

  async getMergedTags(filters: {
    limit: number;
    cursor?: string;
    keyword?: string;
  }): Promise<
    PaginatedResult<{
      name: string;
      skillId: string | null;
      tagId: string | null;
    }>
  > {
    const limit = Math.max(filters.limit ?? 20, 1);
    const whereConditions: SQL[] = [];

    if (filters.keyword?.trim()) {
      whereConditions.push(sql`name ILIKE ${`%${filters.keyword.trim()}%`}`);
    }

    if (filters.cursor) {
      whereConditions.push(sql`created_at < ${new Date(filters.cursor)}`);
    }

    const whereClause =
      whereConditions.length > 0
        ? sql`WHERE ${sql.join(whereConditions, sql` AND `)}`
        : sql``;

    const result = await this.db.execute(sql`
      SELECT name, skill_id, tag_id, created_at
      FROM (
        SELECT
          s.name::text AS name,
          s.id::uuid AS skill_id,
          NULL::uuid AS tag_id,
          s.created_at AS created_at
        FROM ${skills} s

        UNION ALL

        SELECT
          t.name::text AS name,
          NULL::uuid AS skill_id,
          t.id::uuid AS tag_id,
          t.created_at AS created_at
        FROM ${blogTags} t
      ) merged
      ${whereClause}
      ORDER BY created_at DESC, name ASC
      LIMIT ${limit + 1}
    `);

    const rows = result.rows as {
      name: string;
      skill_id: string | null;
      tag_id: string | null;
      created_at: Date | string;
    }[];

    const hasNextPage = rows.length > limit;
    const dataRows = hasNextPage ? rows.slice(0, limit) : rows;
    const last = dataRows[dataRows.length - 1];

    return {
      data: dataRows.map((row) => ({
        name: row.name,
        skillId: row.skill_id,
        tagId: row.tag_id,
      })),
      pagination: {
        nextCursor:
          hasNextPage && last ? new Date(last.created_at).toISOString() : null,
        hasNextPage,
      },
    };
  }

  private buildPostWhere(filters: BlogPostFilters) {
    const conditions: SQL[] = [];

    if (filters.keyword) {
      conditions.push(ilike(blogPosts.title, `%${filters.keyword}%`));
    }

    if (filters.category) {
      conditions.push(eq(blogPosts.categoryId, filters.category));
    }

    return conditions.length ? and(...conditions) : undefined;
  }

  private async getPostTags(postId: string): Promise<
    Array<{
      name: string;
      skillId: string | null;
      tagId: string | null;
    }>
  > {
    const tags = await this.db
      .select({
        skillName: skills.name,
        tagName: blogTags.name,
        skillId: blogPostTags.skillId,
        tagId: blogPostTags.tagId,
      })
      .from(blogPostTags)
      .leftJoin(skills, eq(skills.id, blogPostTags.skillId))
      .leftJoin(blogTags, eq(blogTags.id, blogPostTags.tagId))
      .where(eq(blogPostTags.postId, postId));

    return tags.map((tag) => ({
      name: tag.skillName || tag.tagName || "",
      skillId: tag.skillId,
      tagId: tag.tagId,
    }));
  }

  async getPosts(
    filters: BlogPostFilters,
  ): Promise<PaginatedResult<BlogPostListItem>> {
    const limit = Math.min(filters.limit ?? 10, 50);
    const page = Math.max(filters.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const whereClause = this.buildPostWhere(filters);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          summary: blogPosts.summary,
          thumbnail: blogPosts.thumbnail,
          category: blogPosts.categoryId,
          createdAt: blogPosts.createdAt,
          status: blogPosts.status,
          likes: sql<number>`COUNT(*) FILTER (WHERE ${blogPostActions.action} = 'LIKE')`,
        })
        .from(blogPosts)
        .leftJoin(blogPostActions, eq(blogPostActions.postId, blogPosts.id))
        .where(whereClause)
        .groupBy(
          blogPosts.id,
          blogPosts.title,
          blogPosts.slug,
          blogPosts.summary,
          blogPosts.thumbnail,
          blogPosts.categoryId,
          blogPosts.createdAt,
          blogPosts.status,
        )
        .orderBy(desc(blogPosts.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count(blogPosts.id) })
        .from(blogPosts)
        .where(whereClause),
    ]);

    const total = Number(totalRows[0]?.total ?? 0);

    const dataWithTags = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        summary: row.summary,
        thumbnail: row.thumbnail,
        category: row.category,
        createdAt: row.createdAt,
        status: row.status,
        likes: Number(row.likes ?? 0),
        tags: await this.getPostTags(row.id),
      })),
    );

    return {
      data: dataWithTags,
      pagination: {
        total,
        hasNextPage: offset + rows.length < total,
      },
    };
  }

  async getMyBlogs(
    authorId: string,
    filters: BlogPostFilters,
  ): Promise<PaginatedResult<BlogPostListItem>> {
    const limit = Math.min(filters.limit ?? 10, 50);
    const page = Math.max(filters.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const whereConditions: SQL[] = [eq(blogPosts.authorId, authorId)];

    if (filters.keyword) {
      whereConditions.push(ilike(blogPosts.title, `%${filters.keyword}%`));
    }

    if (filters.category) {
      whereConditions.push(eq(blogPosts.categoryId, filters.category));
    }

    const whereClause = whereConditions.length
      ? and(...whereConditions)
      : undefined;

    const [rows, totalRows] = await Promise.all([
      this.db
        .select({
          id: blogPosts.id,
          title: blogPosts.title,
          slug: blogPosts.slug,
          summary: blogPosts.summary,
          thumbnail: blogPosts.thumbnail,
          category: blogPosts.categoryId,
          createdAt: blogPosts.createdAt,
          status: blogPosts.status,
          likes: sql<number>`COUNT(*) FILTER (WHERE ${blogPostActions.action} = 'LIKE')`,
        })
        .from(blogPosts)
        .leftJoin(blogPostActions, eq(blogPostActions.postId, blogPosts.id))
        .where(whereClause)
        .groupBy(
          blogPosts.id,
          blogPosts.title,
          blogPosts.slug,
          blogPosts.summary,
          blogPosts.thumbnail,
          blogPosts.categoryId,
          blogPosts.createdAt,
          blogPosts.status,
        )
        .orderBy(desc(blogPosts.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count(blogPosts.id) })
        .from(blogPosts)
        .where(whereClause),
    ]);

    const total = Number(totalRows[0]?.total ?? 0);

    const dataWithTags = await Promise.all(
      rows.map(async (row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        summary: row.summary,
        thumbnail: row.thumbnail,
        category: row.category,
        createdAt: row.createdAt,
        status: row.status,
        likes: Number(row.likes ?? 0),
        tags: await this.getPostTags(row.id),
      })),
    );

    return {
      data: dataWithTags,
      pagination: {
        total,
        hasNextPage: offset + rows.length < total,
      },
    };
  }

  async getPostDetailBySlug(
    slug: string,
    userId?: string,
  ): Promise<BlogPostDetail | null> {
    const [post] = await this.db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        summary: blogPosts.summary,
        thumbnail: blogPosts.thumbnail,
        content: blogPosts.content,
        category: blogPosts.categoryId,
        status: blogPosts.status,
        viewCount: blogPosts.viewCount,
        createdAt: blogPosts.createdAt,
        authorId: users.id,
        authorUsername: users.username,
        authorName: users.name,
        authorAvatarUrl: users.avatarUrl,
        likes: sql<number>`COUNT(*) FILTER (WHERE ${blogPostActions.action} = 'LIKE')`,
      })
      .from(blogPosts)
      .innerJoin(users, eq(users.id, blogPosts.authorId))
      .leftJoin(blogPostActions, eq(blogPostActions.postId, blogPosts.id))
      .where(eq(blogPosts.slug, slug))
      .groupBy(
        blogPosts.id,
        blogPosts.title,
        blogPosts.slug,
        blogPosts.summary,
        blogPosts.thumbnail,
        blogPosts.content,
        blogPosts.categoryId,
        blogPosts.status,
        blogPosts.viewCount,
        blogPosts.createdAt,
        users.id,
        users.username,
        users.name,
        users.avatarUrl,
      )
      .limit(1);

    if (!post) return null;

    let isLiked = false;
    let isSaved = false;

    if (userId) {
      const [result] = await this.db
        .select({
          isLiked: sql<boolean>`
      BOOL_OR(${blogPostActions.action} = 'LIKE')
    `,
          isSaved: sql<boolean>`
      BOOL_OR(${blogPostActions.action} = 'SAVE')
    `,
        })
        .from(blogPostActions)
        .where(
          and(
            eq(blogPostActions.postId, post.id),
            eq(blogPostActions.userId, userId),
          ),
        );

      isLiked = result?.isLiked ?? false;
      isSaved = result?.isSaved ?? false;
    }

    const tags = await this.getPostTags(post.id);

    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      summary: post.summary,
      thumbnail: post.thumbnail,
      content: post.content,
      category: post.category,
      status: post.status,
      viewCount: post.viewCount,
      createdAt: post.createdAt,
      author: {
        id: post.authorId,
        username: post.authorUsername,
        name: post.authorName,
        avatarUrl: post.authorAvatarUrl,
      },
      likes: Number(post.likes ?? 0),
      isSaved,
      isLiked,
      tags,
    };
  }

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    const [post] = await this.db
      .select()
      .from(blogPosts)
      .where(eq(blogPosts.slug, slug))
      .limit(1);

    return (post as BlogPost) ?? null;
  }

  async createPost(data: NewBlogPost): Promise<BlogPost> {
    return this.db.transaction(async (tx) => {
      const [created] = await tx.insert(blogPosts).values(data).returning();

      const normalizedTags = (data.tags ?? []).filter(
        (item) => item.tagId || item.skillId,
      );

      if (normalizedTags.length > 0) {
        const tagRows: NewBlogPostTag[] = normalizedTags.map((item) => ({
          postId: created.id,
          tagId: item.tagId ?? null,
          skillId: item.skillId ?? null,
        }));

        await tx.insert(blogPostTags).values(tagRows);
      }

      return created as BlogPost;
    });
  }

  async saveDraft(
    data: {
      title?: string;
      summary?: string;
      content?: string;
      category?: string;
      thumbnail?: string | null;
      tags?: Array<{ tagId?: string | null; skillId?: string | null }>;
      slug?: string;
    },
    authorId: string,
    postId?: string,
  ): Promise<BlogPost> {
    return this.db.transaction(async (tx) => {
      if (postId) {
        const updateData: Record<string, unknown> = {
          status: "DRAFT",
        };

        if (data.title !== undefined) {
          updateData.title = data.title;
        }
        if (data.summary !== undefined) {
          updateData.summary = data.summary;
        }
        if (data.content !== undefined) {
          updateData.content = data.content;
        }
        if (data.category !== undefined) {
          updateData.categoryId = data.category;
        }
        if (data.thumbnail !== undefined) {
          updateData.thumbnail = data.thumbnail;
        }
        if (data.slug !== undefined) {
          updateData.slug = data.slug;
        }

        await tx
          .update(blogPosts)
          .set(updateData)
          .where(eq(blogPosts.id, postId));

        if (data.tags) {
          await tx.delete(blogPostTags).where(eq(blogPostTags.postId, postId));

          const normalizedTags = data.tags.filter(
            (item) => item.tagId || item.skillId,
          );

          if (normalizedTags.length > 0) {
            const tagRows: NewBlogPostTag[] = normalizedTags.map((item) => ({
              postId,
              tagId: item.tagId ?? null,
              skillId: item.skillId ?? null,
            }));
            await tx.insert(blogPostTags).values(tagRows);
          }
        }

        const [updated] = await tx
          .select()
          .from(blogPosts)
          .where(eq(blogPosts.id, postId));

        return updated as BlogPost;
      } else {
        const categoryId = await this.resolveDraftCategoryId(tx, data.category);
        const slug2 = data.slug ?? this.generateSlug(data.title);

        const [created] = await tx
          .insert(blogPosts)
          .values({
            title: data.title ?? "",
            slug: slug2,
            summary: data.summary ?? "",
            content: data.content ?? "",
            categoryId,
            thumbnail: data.thumbnail ?? null,
            authorId,
            status: "DRAFT",
          })
          .returning();

        const normalizedTags = (data.tags ?? []).filter(
          (item) => item.tagId || item.skillId,
        );

        if (normalizedTags.length > 0) {
          const tagRows: NewBlogPostTag[] = normalizedTags.map((item) => ({
            postId: created.id,
            tagId: item.tagId ?? null,
            skillId: item.skillId ?? null,
          }));

          await tx.insert(blogPostTags).values(tagRows);
        }

        return created as BlogPost;
      }
    });
  }

  private async resolveDraftCategoryId(
    tx: DBDrizzleTransaction,
    categoryId?: string,
  ): Promise<string> {
    if (categoryId) {
      return categoryId;
    }

    const [fallbackCategory] = await tx
      .select({ id: blogCategories.id })
      .from(blogCategories)
      .orderBy(asc(blogCategories.createdAt))
      .limit(1);

    if (!fallbackCategory) {
      throw new Error("No blog category configured for creating draft post");
    }

    return fallbackCategory.id;
  }

  private generateSlug(title?: string): string {
    const normalizedTitle = (title ?? "")
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");

    const baseSlug = normalizedTitle || "draft";
    const uniqueTail = `${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
    return `${baseSlug}-${uniqueTail}`;
  }

  async toggleLike(postId: string, userId: string): Promise<void> {
    const [likeAction] = await this.db
      .select()
      .from(blogPostActions)
      .where(
        and(
          eq(blogPostActions.postId, postId),
          eq(blogPostActions.userId, userId),
          eq(blogPostActions.action, "LIKE"),
        ),
      );

    if (likeAction) {
      await this.db
        .delete(blogPostActions)
        .where(eq(blogPostActions.id, likeAction.id));
    } else {
      await this.db.insert(blogPostActions).values({
        postId,
        userId,
        action: "LIKE",
      });
    }
  }

  async toggleSave(postId: string, userId: string): Promise<void> {
    const [saveAction] = await this.db
      .select()
      .from(blogPostActions)
      .where(
        and(
          eq(blogPostActions.postId, postId),
          eq(blogPostActions.userId, userId),
          eq(blogPostActions.action, "SAVE"),
        ),
      );

    if (saveAction) {
      await this.db
        .delete(blogPostActions)
        .where(eq(blogPostActions.id, saveAction.id));
    } else {
      await this.db.insert(blogPostActions).values({
        postId,
        userId,
        action: "SAVE",
      });
    }
  }

  async incrementViewCount(postId: string): Promise<void> {
    await this.db
      .update(blogPosts)
      .set({ viewCount: sql`${blogPosts.viewCount} + 1` })
      .where(eq(blogPosts.id, postId));
  }
}
