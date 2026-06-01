import { Inject, Injectable } from "@nestjs/common";
import { GenericRepository } from "./generic-repository";
import {
  blogCategories,
  blogPosts,
  blogPostTags,
  tags,
} from "../models/blog.model";
import { blogCategoriesTranslation, blogPostsTranslation } from "../models";
import { IBlogRepository } from "@/core/abstracts/repositories/blog-repository.abstract";
import { type DBDrizzle } from "../types";
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
import { PaginatedResult, SortDirection } from "@/common/types";
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
} from "@/core";
import { generateSlug } from "@/common/utils/string";

const resolveSortExpr = (sortBy?: string): SQL => {
  switch (sortBy) {
    case "createdAt":
      return sql`${blogPosts.createdAt}`;
    case "viewCount":
      return sql`${blogPosts.viewCount}`;
    default:
      return sql`coalesce(${blogPosts.updatedAt}, ${blogPosts.createdAt})`;
  }
};

const resolveCursorSortBy = (sortBy?: string): "createdAt" | "updatedAt" => {
  return sortBy === "createdAt" ? "createdAt" : "updatedAt";
};

const buildOrderBy = (sortBy?: string, sortDirection?: SortDirection) => {
  const direction = sortDirection === "asc" ? asc : desc;
  const orderExpr = resolveSortExpr(sortBy);
  return [direction(orderExpr), direction(blogPosts.id)];
};

const buildCursorWhere = (
  cursorExpr: SQL,
  cursorTime: Date,
  cursorId: string,
  sortDirection?: SortDirection,
) => {
  const operator = sortDirection === "asc" ? ">" : "<";
  const sortTimeSql = sql`${cursorTime.toISOString()}::timestamptz AT TIME ZONE 'UTC'`;

  return sql`(
    ${cursorExpr} ${sql.raw(operator)} (${sortTimeSql})
    OR (${cursorExpr} = (${sortTimeSql}) AND ${blogPosts.id} ${sql.raw(operator)} ${cursorId}::uuid)
  )`;
};

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
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, blogPosts);
  }

  private mapToPostDetailBase(post: {
    id: string;
    title: string;
    slug: string;
    summary: string | null;
    thumbnail: string | null;
    content: string | null;
    category: string | null;
    status: BlogPostStatus;
    viewCount: number | null;
    sourceType: string | null;
    source: unknown;
    createdAt: Date | null;
    updatedAt: Date | null;
    authorId: string | null;
    authorUsername: string | null;
    authorName: string | null;
    authorAvatarUrl: string | null;
  }): BlogPostDetailBase {
    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      summary: post.summary ?? "",
      thumbnail: post.thumbnail,
      content: post.content ?? "",
      category: post.category ?? "",
      status: post.status,
      viewCount: post.viewCount ?? 0,
      sourceType: post.sourceType as BlogSourceType,
      source: post.source as BlogPostSource | null,
      createdAt: post.createdAt ?? new Date(),
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
  }

  async get(id: string): Promise<BlogPost | null> {
    const [post] = await this.db
      .select()
      .from(blogPosts)
      .where(and(eq(blogPosts.id, id), isNull(blogPosts.deletedAt)))
      .limit(1);
    return (post as BlogPost) ?? null;
  }

  async getCategories(
    requestLanguage = "vi",
    fallbackLanguage = "vi",
  ): Promise<{ id: string; name: string }[]> {
    const rows = await this.db
      .select({
        id: blogCategories.id,
        name: blogCategories.name,
      })
      .from(blogCategories)
      .orderBy(asc(blogCategories.name));

    const translatedMap = await this.getCategoryTranslationsMap(
      rows.map((item) => item.id),
      requestLanguage,
      fallbackLanguage,
    );

    return rows.map((item) => ({
      ...item,
      name: translatedMap[item.id]?.name || item.name,
    }));
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

  private async getPostTranslationsMap(
    postIds: string[],
    requestLanguage: string,
    fallbackLanguage: string,
  ) {
    if (!postIds.length) {
      return {} as Record<
        string,
        { title: string; summary: string; content: string }
      >;
    }

    const languagePriority = [requestLanguage, fallbackLanguage].filter(
      (value, index, array) => value && array.indexOf(value) === index,
    );

    if (!languagePriority.length) {
      return {};
    }

    const rows = await this.db
      .select({
        postId: blogPostsTranslation.postId,
        languageCode: blogPostsTranslation.languageCode,
        title: blogPostsTranslation.title,
        summary: blogPostsTranslation.summary,
        content: blogPostsTranslation.content,
      })
      .from(blogPostsTranslation)
      .where(
        and(
          inArray(blogPostsTranslation.postId, postIds),
          inArray(blogPostsTranslation.languageCode, languagePriority),
        ),
      );

    const map: Record<
      string,
      { title: string; summary: string; content: string }
    > = {};
    for (const id of postIds) {
      const found = rows.find(
        (row) => row.postId === id && row.languageCode === languagePriority[0],
      );
      const fallback = rows.find(
        (row) => row.postId === id && row.languageCode === languagePriority[1],
      );

      map[id] = {
        title: found?.title || fallback?.title || "",
        summary: found?.summary || fallback?.summary || "",
        content: found?.content || fallback?.content || "",
      };
    }

    return map;
  }

  private async getCategoryTranslationsMap(
    categoryIds: string[],
    requestLanguage: string,
    fallbackLanguage: string,
  ) {
    if (!categoryIds.length) {
      return {} as Record<string, { name: string; description: string | null }>;
    }

    const languagePriority = [requestLanguage, fallbackLanguage].filter(
      (value, index, array) => value && array.indexOf(value) === index,
    );

    if (!languagePriority.length) {
      return {};
    }

    const rows = await this.db
      .select({
        categoryId: blogCategoriesTranslation.categoryId,
        languageCode: blogCategoriesTranslation.languageCode,
        name: blogCategoriesTranslation.name,
        description: blogCategoriesTranslation.description,
      })
      .from(blogCategoriesTranslation)
      .where(
        and(
          inArray(blogCategoriesTranslation.categoryId, categoryIds),
          inArray(blogCategoriesTranslation.languageCode, languagePriority),
        ),
      );

    const map: Record<string, { name: string; description: string | null }> =
      {};

    for (const id of categoryIds) {
      const found = rows.find(
        (row) =>
          row.categoryId === id && row.languageCode === languagePriority[0],
      );
      const fallback = rows.find(
        (row) =>
          row.categoryId === id && row.languageCode === languagePriority[1],
      );

      map[id] = {
        name: found?.name || fallback?.name || "",
        description: found?.description || fallback?.description || null,
      };
    }

    return map;
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
    requestLanguage = "vi",
    fallbackLanguage = "vi",
  ): Promise<PaginatedResult<BlogPostListItem>> {
    const baseWhere = this.buildPostWhere(filters);
    return this.queryPostsWithOffset(
      filters,
      baseWhere,
      requestLanguage,
      fallbackLanguage,
    );
  }

  private async queryPostsWithOffset(
    filters: BlogPostFilters,
    baseWhere: ReturnType<typeof and> | undefined,
    requestLanguage = "vi",
    fallbackLanguage = "vi",
  ): Promise<PaginatedResult<BlogPostListItem>> {
    const limit = Math.min(filters.limit ?? 10, 50);
    const page = Math.max(filters.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const orderBy = buildOrderBy(filters.sortBy, filters.sortDirection);

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
        .orderBy(...orderBy)
        .limit(limit)
        .offset(offset),

      this.db
        .select({ total: count(blogPosts.id) })
        .from(blogPosts)
        .where(baseWhere),
    ]);

    const total = Number(totalRows[0]?.total ?? 0);
    const translatedMap = await this.getPostTranslationsMap(
      rows.map((item) => item.id),
      requestLanguage,
      fallbackLanguage,
    );

    const totalPages = Math.ceil(total / limit);

    return {
      data: rows.map((item) => ({
        ...item,
        title: translatedMap[item.id]?.title || item.title,
        summary: translatedMap[item.id]?.summary || item.summary,
        sourceType: item.sourceType as BlogSourceType,
        source: item.source as BlogPostSource | null,
      })) as BlogPostListItem[],
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
    requestLanguage = "vi",
    fallbackLanguage = "vi",
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
    return this.queryPostsWithCursor(
      filters,
      baseWhere,
      requestLanguage,
      fallbackLanguage,
    );
  }

  async getSavedBlogs(
    userId: string,
    filters: BlogPostFilters,
  ): Promise<PaginatedResult<BlogPostListItem>> {
    const limit = Math.min(filters.limit ?? 10, 50);
    const decoded = decodeCursor(filters.cursor);
    const sortBy = resolveCursorSortBy(filters.sortBy);
    const sortDirection = filters.sortDirection ?? "desc";
    const cursorExpr = resolveSortExpr(sortBy);
    const orderBy = buildOrderBy(sortBy, sortDirection);

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
          buildCursorWhere(
            cursorExpr,
            decoded.sortTime,
            decoded.id,
            sortDirection,
          ),
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
        .orderBy(...orderBy)
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
    const cursorTime =
      sortBy === "createdAt"
        ? last?.createdAt
        : (last?.updatedAt ?? last?.createdAt);

    return {
      data: data as BlogPostListItem[],
      pagination: {
        total: Number(totalRows[0]?.total ?? 0),
        hasNextPage,
        nextCursor:
          hasNextPage && last && cursorTime
            ? encodeCursor(cursorTime, last.id)
            : null,
      },
    };
  }

  private async queryPostsWithCursor(
    filters: BlogPostFilters,
    baseWhere: SQL | ReturnType<typeof and> | undefined,
    requestLanguage = "vi",
    fallbackLanguage = "vi",
  ): Promise<PaginatedResult<BlogPostListItem>> {
    const limit = Math.min(filters.limit ?? 10, 50);
    const decoded = decodeCursor(filters.cursor);
    const sortBy = resolveCursorSortBy(filters.sortBy);
    const sortDirection = filters.sortDirection ?? "desc";
    const cursorExpr = resolveSortExpr(sortBy);
    const orderBy = buildOrderBy(sortBy, sortDirection);

    const finalWhere = decoded
      ? and(
          baseWhere,
          buildCursorWhere(
            cursorExpr,
            decoded.sortTime,
            decoded.id,
            sortDirection,
          ),
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
        .orderBy(...orderBy)
        .limit(limit + 1),

      this.db
        .select({ total: count(blogPosts.id) })
        .from(blogPosts)
        .where(baseWhere),
    ]);

    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    const last = data[data.length - 1];
    const translatedMap = await this.getPostTranslationsMap(
      data.map((item) => item.id),
      requestLanguage,
      fallbackLanguage,
    );
    const cursorTime =
      sortBy === "createdAt"
        ? last?.createdAt
        : (last?.updatedAt ?? last?.createdAt);

    return {
      data: data.map((item) => ({
        ...item,
        title: translatedMap[item.id]?.title || item.title,
        summary: translatedMap[item.id]?.summary || item.summary,
      })) as BlogPostListItem[],
      pagination: {
        total: Number(totalRows[0]?.total ?? 0),
        hasNextPage,
        nextCursor:
          hasNextPage && last && cursorTime
            ? encodeCursor(cursorTime, last.id)
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

  async getPostBaseBySlug(
    slug: string,
    requestLanguage = "vi",
    fallbackLanguage = "vi",
  ): Promise<BlogPostDetailBase | null> {
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

    const translatedMap = await this.getPostTranslationsMap(
      [post.id],
      requestLanguage,
      fallbackLanguage,
    );
    const translated = translatedMap[post.id];

    return this.mapToPostDetailBase({
      ...post,
      title: translated?.title || post.title,
      summary: translated?.summary || post.summary,
      content: translated?.content || post.content,
    });
  }

  async getPostBaseById(id: string): Promise<BlogPostDetailBase | null> {
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

    return this.mapToPostDetailBase(post);
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
      const tagRows: NewBlogPostTag[] = normalizedTags.map((item) => ({
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
