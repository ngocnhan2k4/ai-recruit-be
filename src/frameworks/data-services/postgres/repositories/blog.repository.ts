import { Inject, Injectable, Logger } from "@nestjs/common";
import { GenericRepository } from "./generic-repository";
import {
  blogCategories,
  blogPosts,
  blogPostTags,
  tags,
} from "../models/blog.model";
import { IBlogRepository } from "@/core/abstracts/repositories/blog-repository.abstract";
import { DBDrizzleTransaction, type DBDrizzle } from "../types";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  sql,
  SQL,
  ne,
  isNull,
  or,
} from "drizzle-orm";
import { skills, users, userActions } from "../models";
import { ObjectType, UserActionType } from "@/core/entities";
import { PaginatedResult } from "@/common/types";
import {
  BlogPostDetailBase,
  BlogPostFilters,
  BlogPostListItem,
  BlogPostSource,
  BlogSourceType,
  BlogPostTagItem,
} from "@/core/entities/blog.entity";
import {
  BlogPost,
  BlogPostStatus,
  NewBlogPost,
  NewBlogPostTag,
  BlogCategory,
  Tag,
  ICacheService,
} from "@/core";
import { generateSlug } from "@/common/utils/string";
import { cacheWithDedup } from "@/common/utils";
import { CACHE_KEYS, SHORT_TTL } from "@/common/constants/cache";

const sortExpr = (bp: typeof blogPosts) =>
  sql`coalesce(${bp.updatedAt}, ${bp.createdAt})`;

function encodeCursor(
  sortTime: Date | string | null | undefined,
  id: string,
): string {
  const t = sortTime
    ? new Date(sortTime).toISOString()
    : new Date(0).toISOString();
  return `${t}|${id}`;
}

function decodeCursor(
  cursor: string | undefined | null,
): { sortTime: Date; id: string } | null {
  if (!cursor) return null;
  try {
    const decoded = decodeURIComponent(cursor);
    const parts = decoded.split("|");
    if (parts.length !== 2) return null;
    const d = new Date(parts[0]);
    if (isNaN(d.getTime())) return null;
    return { sortTime: d, id: parts[1] };
  } catch {
    return null;
  }
}
@Injectable()
export class BlogRepository
  extends GenericRepository<BlogPost, typeof blogPosts>
  implements IBlogRepository
{
  private readonly logger = new Logger(BlogRepository.name);

  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    @Inject(ICacheService) private readonly cacheService: ICacheService,
  ) {
    super(db, blogPosts);
  }

  private async invalidateBlogCache(postId: string, slug?: string) {
    const pattern = CACHE_KEYS.blog.patternDetail(postId);

    try {
      const matchedKeys = await this.cacheService.getKeysByPattern(pattern);
      const keysToDelete = [...matchedKeys];
      if (slug) {
        keysToDelete.push(CACHE_KEYS.blog.getPostBaseBySlug(slug));
      }
      if (keysToDelete.length > 0) {
        await this.cacheService.deleteMultipleKeys(keysToDelete);
      }
    } catch (err) {
      this.logger.warn(
        `[cache] Failed to invalidate blog cache for ${postId} (pattern ${pattern})`,
        err,
      );
    }
  }

  async update(
    where: Partial<BlogPost>,
    item: Partial<BlogPost>,
    tx?: DBDrizzleTransaction,
  ): Promise<BlogPost[]> {
    const data = await super.update(where, item, tx);

    await Promise.all(
      data.map((blog) => this.invalidateBlogCache(blog.id, blog.slug)),
    );
    return data;
  }

  async delete(
    where: Partial<BlogPost>,
    tx?: DBDrizzleTransaction,
  ): Promise<BlogPost[]> {
    const data = await super.delete(where, tx);

    await Promise.all(
      data.map((blog) => this.invalidateBlogCache(blog.id, blog.slug)),
    );
    return data;
  }

  async get(id: string): Promise<BlogPost | null> {
    const key = CACHE_KEYS.blog.get(id);
    return cacheWithDedup<BlogPost | null>(
      key,
      () => this.cacheService.getJson<BlogPost | null>(key),
      async () => {
        const [post] = await this.db
          .select()
          .from(blogPosts)
          .where(and(eq(blogPosts.id, id), isNull(blogPosts.deletedAt)))
          .limit(1);
        return (post as BlogPost) ?? null;
      },
      (data: BlogPost | null) =>
        this.cacheService.setJson(key, data, SHORT_TTL),
      {
        logger: this.logger,
      },
    );
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
        FROM ${tags} t
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

  private buildPostWhere(
    filters: Pick<
      BlogPostFilters,
      "keyword" | "category" | "status" | "excludeStatus" | "sourceType"
    >,
  ) {
    const conditions: SQL[] = [isNull(blogPosts.deletedAt)];

    if (filters.keyword) {
      conditions.push(ilike(blogPosts.title, `%${filters.keyword}%`));
    }

    if (filters.category) {
      conditions.push(eq(blogPosts.categoryId, filters.category));
    }

    if (filters.status) {
      conditions.push(eq(blogPosts.status, filters.status));
    }

    if (filters.excludeStatus) {
      conditions.push(ne(blogPosts.status, filters.excludeStatus));
    }

    if (filters.sourceType) {
      conditions.push(eq(blogPosts.sourceType, filters.sourceType));
    }

    return and(...conditions);
  }

  async getPostTagsByPostId(postId: string): Promise<BlogPostTagItem[]> {
    const _tags = await this.db
      .select({
        skillName: skills.name,
        tagName: tags.name,
        skillId: blogPostTags.skillId,
        tagId: blogPostTags.tagId,
      })
      .from(blogPostTags)
      .leftJoin(skills, eq(skills.id, blogPostTags.skillId))
      .leftJoin(tags, eq(tags.id, blogPostTags.tagId))
      .where(eq(blogPostTags.postId, postId));

    return _tags.map((tag) => ({
      name: tag.skillName || tag.tagName || "",
      skillId: tag.skillId,
      tagId: tag.tagId,
    }));
  }

  async getPosts(
    filters: BlogPostFilters,
  ): Promise<PaginatedResult<BlogPostListItem>> {
    const baseWhere = this.buildPostWhere(filters);
    return this.queryPostsWithOffset(filters, baseWhere);
  }

  private async queryPostsWithOffset(
    filters: BlogPostFilters,
    baseWhere: ReturnType<typeof and> | undefined,
  ): Promise<PaginatedResult<BlogPostListItem>> {
    const limit = Math.min(filters.limit ?? 10, 50);
    const page = Math.max(filters.page ?? 1, 1);
    const offset = (page - 1) * limit;

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
          updatedAt: blogPosts.updatedAt,
          status: sql<BlogPostStatus>`${blogPosts.status}`,
          sourceType: blogPosts.sourceType,
          source: blogPosts.source,
        })
        .from(blogPosts)
        .where(baseWhere)
        .orderBy(desc(blogPosts.createdAt), desc(blogPosts.id))
        .limit(limit)
        .offset(offset),

      this.db
        .select({ total: count(blogPosts.id) })
        .from(blogPosts)
        .where(baseWhere),
    ]);

    const total = Number(totalRows[0]?.total ?? 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data: rows as BlogPostListItem[],
      pagination: {
        total,
        hasNextPage: page < totalPages,
        nextCursor: null,
      },
    };
  }

  async getMyBlogs(
    authorId: string,
    filters: BlogPostFilters,
  ): Promise<PaginatedResult<BlogPostListItem>> {
    const conditions: SQL[] = [
      eq(blogPosts.authorId, authorId),
      isNull(blogPosts.deletedAt),
    ];
    if (filters.keyword)
      conditions.push(ilike(blogPosts.title, `%${filters.keyword}%`));
    if (filters.category)
      conditions.push(eq(blogPosts.categoryId, filters.category));
    if (filters.status) conditions.push(eq(blogPosts.status, filters.status));
    const baseWhere = and(...conditions);
    return this.queryPostsWithCursor(filters, baseWhere);
  }

  async getSavedBlogs(
    userId: string,
    filters: BlogPostFilters,
  ): Promise<PaginatedResult<BlogPostListItem>> {
    const limit = Math.min(filters.limit ?? 10, 50);
    const decoded = decodeCursor(filters.cursor);

    const conditions: SQL[] = [
      eq(userActions.userId, userId),
      eq(userActions.objectType, ObjectType.BLOG),
      eq(userActions.type, UserActionType.SAVE),
      sql`${userActions.deletedAt} IS NULL`,
      eq(blogPosts.status, BlogPostStatus.PUBLISHED),
      isNull(blogPosts.deletedAt),
    ];

    if (filters.keyword)
      conditions.push(ilike(blogPosts.title, `%${filters.keyword}%`));
    if (filters.category)
      conditions.push(eq(blogPosts.categoryId, filters.category));

    const baseWhere = and(...conditions);

    const finalWhere = decoded
      ? and(
          baseWhere,
          sql`(
            ${sortExpr(blogPosts)} < ${decoded.sortTime}
            OR (${sortExpr(blogPosts)} = ${decoded.sortTime} AND ${blogPosts.id} < ${decoded.id}::uuid)
          )`,
        )
      : baseWhere;

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
          updatedAt: blogPosts.updatedAt,
          status: sql<BlogPostStatus>`${blogPosts.status}`,
          sourceType: blogPosts.sourceType,
          source: blogPosts.source,
        })
        .from(userActions)
        .innerJoin(blogPosts, eq(blogPosts.id, userActions.objectId))
        .where(finalWhere)
        .orderBy(desc(sortExpr(blogPosts)), desc(blogPosts.id))
        .limit(limit + 1),

      this.db
        .select({ total: count(blogPosts.id) })
        .from(userActions)
        .innerJoin(blogPosts, eq(blogPosts.id, userActions.objectId))
        .where(
          and(
            eq(userActions.userId, userId),
            eq(userActions.objectType, ObjectType.BLOG),
            eq(userActions.type, UserActionType.SAVE),
            sql`${userActions.deletedAt} IS NULL`,
            eq(blogPosts.status, BlogPostStatus.PUBLISHED),
          ),
        ),
    ]);

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    const last = data[data.length - 1];

    return {
      data: data as BlogPostListItem[],
      pagination: {
        total: Number(totalRows[0]?.total ?? 0),
        hasNextPage,
        nextCursor:
          hasNextPage && last
            ? encodeCursor(last.updatedAt ?? last.createdAt, last.id)
            : null,
      },
    };
  }

  private async queryPostsWithCursor(
    filters: BlogPostFilters,
    baseWhere: SQL | ReturnType<typeof and> | undefined,
  ): Promise<PaginatedResult<BlogPostListItem>> {
    const limit = Math.min(filters.limit ?? 10, 50);
    const decoded = decodeCursor(filters.cursor);

    const finalWhere = decoded
      ? and(
          baseWhere,
          sql`(
            ${sortExpr(blogPosts)} < (${decoded.sortTime.toISOString()}::timestamptz AT TIME ZONE 'UTC')
            OR (${sortExpr(blogPosts)} = (${decoded.sortTime.toISOString()}::timestamptz AT TIME ZONE 'UTC') AND ${blogPosts.id} < ${decoded.id}::uuid)
          )`,
        )
      : baseWhere;

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
          updatedAt: blogPosts.updatedAt,
          status: sql<BlogPostStatus>`${blogPosts.status}`,
          sourceType: blogPosts.sourceType,
          source: blogPosts.source,
        })
        .from(blogPosts)
        .where(finalWhere)
        .orderBy(desc(sortExpr(blogPosts)), desc(blogPosts.id))
        .limit(limit + 1),

      this.db
        .select({ total: count(blogPosts.id) })
        .from(blogPosts)
        .where(baseWhere),
    ]);

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    const last = data[data.length - 1];

    return {
      data: data as BlogPostListItem[],
      pagination: {
        total: Number(totalRows[0]?.total ?? 0),
        hasNextPage,
        nextCursor:
          hasNextPage && last
            ? encodeCursor(last.updatedAt ?? last.createdAt, last.id)
            : null,
      },
    };
  }

  async getPostsTags(
    postIds: string[],
  ): Promise<Record<string, BlogPostTagItem[]>> {
    if (!postIds || postIds.length === 0) return {};

    const _tags = await this.db
      .select({
        postId: blogPostTags.postId,
        skillName: skills.name,
        tagName: tags.name,
        skillId: blogPostTags.skillId,
        tagId: blogPostTags.tagId,
      })
      .from(blogPostTags)
      .leftJoin(skills, eq(skills.id, blogPostTags.skillId))
      .leftJoin(tags, eq(tags.id, blogPostTags.tagId))
      .where(inArray(blogPostTags.postId, postIds));

    return _tags.reduce(
      (acc, tag) => {
        if (!acc[tag.postId]) acc[tag.postId] = [];
        acc[tag.postId].push({
          name: tag.skillName || tag.tagName || "",
          skillId: tag.skillId,
          tagId: tag.tagId,
        });
        return acc;
      },
      {} as Record<
        string,
        Array<{ name: string; skillId: string | null; tagId: string | null }>
      >,
    );
  }

  async getPostBaseBySlug(slug: string): Promise<BlogPostDetailBase | null> {
    const key = CACHE_KEYS.blog.getPostBaseBySlug(slug);
    return cacheWithDedup<BlogPostDetailBase | null>(
      key,
      () => this.cacheService.getJson<BlogPostDetailBase | null>(key),
      async () => {
        const [post] = await this.db
          .select({
            id: blogPosts.id,
            title: blogPosts.title,
            slug: blogPosts.slug,
            summary: blogPosts.summary,
            thumbnail: blogPosts.thumbnail,
            content: blogPosts.content,
            category: blogPosts.categoryId,
            status: sql<BlogPostStatus>`${blogPosts.status}`,
            viewCount: blogPosts.viewCount,
            sourceType: blogPosts.sourceType,
            source: blogPosts.source,
            createdAt: blogPosts.createdAt,
            updatedAt: blogPosts.updatedAt,
            authorId: users.id,
            authorUsername: users.username,
            authorName: users.name,
            authorAvatarUrl: users.avatarUrl,
          })
          .from(blogPosts)
          .leftJoin(users, eq(users.id, blogPosts.authorId))
          .where(and(eq(blogPosts.slug, slug), isNull(blogPosts.deletedAt)))
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
            blogPosts.sourceType,
            blogPosts.source,
            blogPosts.createdAt,
            users.id,
            users.username,
            users.name,
            users.avatarUrl,
            blogPosts.updatedAt,
          )
          .limit(1);

        if (!post) return null;

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
          sourceType: post.sourceType as BlogSourceType,
          source: post.source as BlogPostSource | null,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          author: post.authorId
            ? {
                id: post.authorId,
                username: post.authorUsername!,
                name: post.authorName!,
                avatarUrl: post.authorAvatarUrl,
              }
            : null,
        };
      },
      (data: BlogPostDetailBase | null) =>
        this.cacheService.setJson(key, data, SHORT_TTL),
      {
        logger: this.logger,
      },
    );
  }

  async getPostBaseById(id: string): Promise<BlogPostDetailBase | null> {
    const key = CACHE_KEYS.blog.getPostBaseById(id);
    return cacheWithDedup<BlogPostDetailBase | null>(
      key,
      () => this.cacheService.getJson<BlogPostDetailBase | null>(key),
      async () => {
        const [post] = await this.db
          .select({
            id: blogPosts.id,
            title: blogPosts.title,
            slug: blogPosts.slug,
            summary: blogPosts.summary,
            thumbnail: blogPosts.thumbnail,
            content: blogPosts.content,
            category: blogPosts.categoryId,
            status: sql<BlogPostStatus>`${blogPosts.status}`,
            viewCount: blogPosts.viewCount,
            sourceType: blogPosts.sourceType,
            source: blogPosts.source,
            createdAt: blogPosts.createdAt,
            updatedAt: blogPosts.updatedAt,
            authorId: users.id,
            authorUsername: users.username,
            authorName: users.name,
            authorAvatarUrl: users.avatarUrl,
          })
          .from(blogPosts)
          .leftJoin(users, eq(users.id, blogPosts.authorId))
          .where(and(eq(blogPosts.id, id), isNull(blogPosts.deletedAt)))
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
            blogPosts.sourceType,
            blogPosts.source,
            blogPosts.createdAt,
            users.id,
            users.username,
            users.name,
            users.avatarUrl,
            blogPosts.updatedAt,
          )
          .limit(1);

        if (!post) return null;

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
          sourceType: post.sourceType as BlogSourceType,
          source: post.source as BlogPostSource | null,
          createdAt: post.createdAt,
          updatedAt: post.updatedAt,
          author: post.authorId
            ? {
                id: post.authorId,
                username: post.authorUsername!,
                name: post.authorName!,
                avatarUrl: post.authorAvatarUrl,
              }
            : null,
        };
      },
      (data: BlogPostDetailBase | null) =>
        this.cacheService.setJson(key, data, SHORT_TTL),
      {
        logger: this.logger,
      },
    );
  }

  async getPostBySlug(slug: string): Promise<BlogPost | null> {
    const [post] = await this.db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.slug, slug), isNull(blogPosts.deletedAt)))
      .limit(1);

    return (post as BlogPost) ?? null;
  }

  async createPost(data: NewBlogPost): Promise<BlogPost> {
    return this.executeWithTransaction(async () => {
      const db = this.getExecutor();
      const [created] = await db.insert(blogPosts).values(data).returning();

      const normalizedTags = (data.tags ?? []).filter(
        (item) => item.tagId || item.skillId,
      );

      if (normalizedTags.length > 0) {
        await this.updatePostTags(created.id, normalizedTags);
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
    return this.executeWithTransaction(async () => {
      const tx = this.getExecutor();
      if (postId) {
        const updateData: Record<string, unknown> = { status: "DRAFT" };

        if (data.title !== undefined) updateData.title = data.title;
        if (data.summary !== undefined) updateData.summary = data.summary;
        if (data.content !== undefined) updateData.content = data.content;
        if (data.category !== undefined) updateData.categoryId = data.category;
        if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail;
        if (data.slug !== undefined) updateData.slug = data.slug;

        await tx
          .update(blogPosts)
          .set(updateData)
          .where(eq(blogPosts.id, postId));

        if (data.tags) {
          await this.updatePostTags(postId, data.tags);
        }

        const [updated] = await tx
          .select()
          .from(blogPosts)
          .where(eq(blogPosts.id, postId));
        if (updated) {
          await this.invalidateBlogCache(updated.id, updated.slug);
        }
        return updated as BlogPost;
      } else {
        const categoryId = await this.resolveDraftCategoryId(data.category);
        const slug2 = data.slug ?? generateSlug(data.title || "draft");

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

  private async resolveDraftCategoryId(categoryId?: string): Promise<string> {
    const tx = this.getExecutor();
    if (categoryId) return categoryId;

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

  async incrementViewCount(
    data: { postId: string; viewCount: number }[],
  ): Promise<void> {
    if (data.length === 0) return;

    const valueRows = sql.join(
      data.map((row) => sql`(${row.postId}::uuid, ${row.viewCount}::int)`),
      sql`, `,
    );

    await this.db.execute(sql`
      UPDATE ${blogPosts}
      SET view_count = ${blogPosts.viewCount} + v.inc
      FROM (VALUES ${valueRows}) AS v(id, inc)
      WHERE ${blogPosts.id} = v.id
    `);
  }

  async updatePostTags(
    postId: string,
    tags: Array<{ tagId?: string | null; skillId?: string | null }>,
  ): Promise<void> {
    const executor = this.getExecutor();
    await executor.delete(blogPostTags).where(eq(blogPostTags.postId, postId));

    const normalizedTags = tags.filter((item) => item.tagId || item.skillId);
    if (normalizedTags.length > 0) {
      const tagRows: any[] = normalizedTags.map((item) => ({
        postId,
        tagId: item.tagId ?? null,
        skillId: item.skillId ?? null,
      }));
      await executor.insert(blogPostTags).values(tagRows);
    }
  }

  async getCategoriesPaginated(filters: {
    keyword?: string;
    page: number;
    limit: number;
  }): Promise<PaginatedResult<BlogCategory>> {
    const limit = Math.min(filters.limit ?? 10, 50);
    const page = Math.max(filters.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [isNull(blogCategories.deletedAt)];
    if (filters.keyword) {
      conditions.push(ilike(blogCategories.name, `%${filters.keyword}%`));
    }

    const baseWhere = and(...conditions);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(blogCategories)
        .where(baseWhere)
        .orderBy(desc(blogCategories.createdAt))
        .limit(limit)
        .offset(offset),

      this.db
        .select({ total: count(blogCategories.id) })
        .from(blogCategories)
        .where(baseWhere),
    ]);

    const total = Number(totalRows[0]?.total ?? 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data: rows,
      pagination: {
        total,
        hasNextPage: page < totalPages,
        nextCursor: null,
      },
    };
  }

  async getTagsPaginated(filters: {
    keyword?: string;
    page: number;
    limit: number;
  }): Promise<PaginatedResult<Tag>> {
    const limit = Math.min(filters.limit ?? 10, 50);
    const page = Math.max(filters.page ?? 1, 1);
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [isNull(tags.deletedAt)];
    if (filters.keyword) {
      conditions.push(ilike(tags.name, `%${filters.keyword}%`));
    }

    const baseWhere = and(...conditions);

    const [rows, totalRows] = await Promise.all([
      this.db
        .select()
        .from(tags)
        .where(baseWhere)
        .orderBy(desc(tags.createdAt))
        .limit(limit)
        .offset(offset),

      this.db
        .select({ total: count(tags.id) })
        .from(tags)
        .where(baseWhere),
    ]);

    const total = Number(totalRows[0]?.total ?? 0);
    const totalPages = Math.ceil(total / limit);

    return {
      data: rows,
      pagination: {
        total,
        hasNextPage: page < totalPages,
        nextCursor: null,
      },
    };
  }

  async createCategory(data: {
    name: string;
    description?: string;
  }): Promise<BlogCategory> {
    const [created] = await this.db
      .insert(blogCategories)
      .values(data)
      .returning();
    return created;
  }

  async createTag(data: { name: string; slug: string }): Promise<Tag> {
    const [created] = await this.db.insert(tags).values(data).returning();
    return created;
  }

  async getCategoryByName(name: string): Promise<BlogCategory | null> {
    const [row] = await this.db
      .select()
      .from(blogCategories)
      .where(
        and(eq(blogCategories.name, name), isNull(blogCategories.deletedAt)),
      )
      .limit(1);
    return row ?? null;
  }

  async getTagByNameOrSlug(name: string, slug: string): Promise<Tag | null> {
    const [row] = await this.db
      .select()
      .from(tags)
      .where(
        and(
          or(eq(tags.name, name), eq(tags.slug, slug)),
          isNull(tags.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  }
}
