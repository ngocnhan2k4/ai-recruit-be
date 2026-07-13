import { CACHE_KEYS, SHORT_TTL } from "@/common/constants/cache";
import { PaginatedResult, SortDirection } from "@/common/types";
import {
  buildLanguagePriority,
  cacheWithDedup,
  getFallbackLanguage,
  getRequestLanguage,
} from "@/common/utils";
import { generateSlug } from "@/common/utils/string";
import {
  BlogCategory,
  BlogPost,
  BlogPostStatus,
  ICacheService,
  NewBlogPost,
  NewBlogPostTag,
  Tag,
} from "@/core";
import { IBlogRepository } from "@/core/abstracts/repositories/blog-repository.abstract";
import { ObjectType, UserActionType } from "@/core/entities";
import {
  BlogLocaleMap,
  BlogPostDetailBase,
  BlogPostFilters,
  BlogPostListItem,
  BlogPostSource,
  BlogPostTagItem,
  BlogSourceType,
} from "@/core/entities/blog.entity";
import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  ne,
  or,
  sql,
  SQL,
} from "drizzle-orm";
import { skills, userActions, users } from "../models";
import {
  blogCategories,
  blogPosts,
  blogPostTags,
  tags,
} from "../models/blog.model";
import { DBDrizzleTransaction, type DBDrizzle } from "../types";
import { GenericRepository } from "./generic-repository";

const resolveSortExpr = (sortBy?: string): SQL => {
  switch (sortBy) {
    case "viewCount":
      return sql`${blogPosts.viewCount}`;
    case "createdAt":
      return sql`${blogPosts.createdAt}`;
    default:
      return sql`${blogPosts.updatedAt}`;
  }
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
    if (Number.isNaN(d.getTime())) return null;
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
    const patterns = [CACHE_KEYS.blog.patternDetail(postId)];
    if (slug) {
      patterns.push(CACHE_KEYS.blog.patternSlugDetail(slug));
    }

    try {
      const matchedGroups = await Promise.all(
        patterns.map((pattern) => this.cacheService.getKeysByPattern(pattern)),
      );
      const keysToDelete = [...new Set(matchedGroups.flat())];

      if (keysToDelete.length > 0) {
        await this.cacheService.deleteMultipleKeys(keysToDelete);
      }
    } catch (err) {
      this.logger.warn(
        `[cache] Failed to invalidate blog cache for ${postId}`,
        err,
      );
    }
  }

  private normalizeLocaleMap(value: unknown): BlogLocaleMap {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    return Object.entries(value as Record<string, unknown>).reduce(
      (acc, [languageCode, localizedContent]) => {
        if (
          !localizedContent ||
          typeof localizedContent !== "object" ||
          Array.isArray(localizedContent)
        ) {
          return acc;
        }

        const normalized = Object.entries(
          localizedContent as Record<string, unknown>,
        ).reduce(
          (fieldAcc, [field, fieldValue]) => {
            if (
              (field === "title" ||
                field === "summary" ||
                field === "content") &&
              typeof fieldValue === "string"
            ) {
              fieldAcc[field] = fieldValue;
            }
            return fieldAcc;
          },
          {} as NonNullable<BlogLocaleMap[string]>,
        );

        if (Object.keys(normalized).length > 0) {
          acc[languageCode] = normalized;
        }

        return acc;
      },
      {} as BlogLocaleMap,
    );
  }

  private resolveLocalizedValue(params: {
    locales?: Record<string, any> | null;
    field: "title" | "summary" | "content";
    requestLanguage: string;
    fallbackLanguage: string;
    baseValue: string | null;
  }) {
    const locales = params.locales ?? {};
    for (const languageCode of buildLanguagePriority(
      params.requestLanguage,
      params.fallbackLanguage,
    )) {
      const resolved = locales[languageCode]?.[params.field];
      if (typeof resolved === "string" && resolved.length > 0) {
        return resolved;
      }
    }

    return params.baseValue ?? "";
  }

  private mapToPostDetailBase(post: {
    id: string;
    title: string;
    locales?: Record<string, any> | null;
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
      locales: post.locales ?? {},
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

  async getCategories(): Promise<{ id: string; name: string }[]> {
    return await this.db
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
      const keywordPattern = `%${filters.keyword.trim()}%`;
      whereConditions.push(sql`name ILIKE ${keywordPattern}`);
    }

    if (filters.cursor) {
      whereConditions.push(sql`created_at < ${new Date(filters.cursor)}`);
    }

    const andSeparator = sql` AND `;
    const whereClause =
      whereConditions.length > 0
        ? sql`WHERE ${sql.join(whereConditions, andSeparator)}`
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
    const last = dataRows.at(-1);

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
      | "keyword"
      | "category"
      | "status"
      | "excludeStatus"
      | "sourceType"
      | "skillIds"
    >,
  ) {
    const conditions: SQL[] = [isNull(blogPosts.deletedAt)];

    if (filters.keyword) {
      conditions.push(
        sql`unaccent(${blogPosts.title}) ILIKE unaccent(${"%" + filters.keyword + "%"})`,
      );
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

    if (filters.skillIds && filters.skillIds.length > 0) {
      conditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${blogPostTags}
          WHERE ${blogPostTags.postId} = ${blogPosts.id}
          AND ${blogPostTags.skillId} = ANY(ARRAY[${sql.join(
            filters.skillIds.map((id) => sql`${id}::uuid`),
            sql`, `,
          )}])
        )`,
      );
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
    return this.queryPostsWithOffset(
      filters,
      baseWhere,
      getRequestLanguage(),
      getFallbackLanguage(),
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
          locales: blogPosts.locales,
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
    const totalPages = Math.ceil(total / limit);

    return {
      data: rows.map((item) => ({
        ...item,
        title: this.resolveLocalizedValue({
          locales: this.normalizeLocaleMap(item.locales),
          field: "title",
          requestLanguage,
          fallbackLanguage,
          baseValue: item.title,
        }),
        summary: this.resolveLocalizedValue({
          locales: this.normalizeLocaleMap(item.locales),
          field: "summary",
          requestLanguage,
          fallbackLanguage,
          baseValue: item.summary,
        }),
        locales: this.normalizeLocaleMap(item.locales),
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
      getRequestLanguage(),
      getFallbackLanguage(),
    );
  }

  async getSavedBlogs(
    userId: string,
    filters: BlogPostFilters,
  ): Promise<PaginatedResult<BlogPostListItem>> {
    const requestLanguage = getRequestLanguage();
    const fallbackLanguage = getFallbackLanguage();
    const limit = Math.min(filters.limit ?? 10, 50);
    const decoded = decodeCursor(filters.cursor);
    const sortBy = filters.sortBy;
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
          locales: blogPosts.locales,
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
    const last = data.at(-1);
    const cursorTime =
      sortBy === "createdAt"
        ? last?.createdAt
        : (last?.updatedAt ?? last?.createdAt);

    return {
      data: data.map((item) => ({
        ...item,
        title: this.resolveLocalizedValue({
          locales: this.normalizeLocaleMap(item.locales),
          field: "title",
          requestLanguage,
          fallbackLanguage,
          baseValue: item.title,
        }),
        summary: this.resolveLocalizedValue({
          locales: this.normalizeLocaleMap(item.locales),
          field: "summary",
          requestLanguage,
          fallbackLanguage,
          baseValue: item.summary,
        }),
        locales: this.normalizeLocaleMap(item.locales),
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

  private async queryPostsWithCursor(
    filters: BlogPostFilters,
    baseWhere: SQL | ReturnType<typeof and> | undefined,
    requestLanguage = "vi",
    fallbackLanguage = "vi",
  ): Promise<PaginatedResult<BlogPostListItem>> {
    const limit = Math.min(filters.limit ?? 10, 50);
    const decoded = decodeCursor(filters.cursor);
    const sortBy = filters.sortBy;
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
          locales: blogPosts.locales,
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
    const last = data.at(-1);
    const cursorTime = last?.updatedAt ?? last?.createdAt;

    return {
      data: data.map((item) => ({
        ...item,
        title: this.resolveLocalizedValue({
          locales: this.normalizeLocaleMap(item.locales),
          field: "title",
          requestLanguage,
          fallbackLanguage,
          baseValue: item.title,
        }),
        summary: this.resolveLocalizedValue({
          locales: this.normalizeLocaleMap(item.locales),
          field: "summary",
          requestLanguage,
          fallbackLanguage,
          baseValue: item.summary,
        }),
        locales: this.normalizeLocaleMap(item.locales),
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

  async getPostBaseBySlug(slug: string): Promise<BlogPostDetailBase | null> {
    const requestLanguage = getRequestLanguage();
    const fallbackLanguage = getFallbackLanguage();
    const key = CACHE_KEYS.blog.getPostBaseBySlug(
      slug,
      requestLanguage,
      fallbackLanguage,
    );

    return cacheWithDedup<BlogPostDetailBase | null>(
      key,
      () => this.cacheService.getJson<BlogPostDetailBase | null>(key),
      async () => {
        const [post] = await this.db
          .select({
            id: blogPosts.id,
            title: blogPosts.title,
            locales: blogPosts.locales,
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
          .limit(1);

        if (!post) return null;

        const locales = this.normalizeLocaleMap(post.locales);

        return this.mapToPostDetailBase({
          ...post,
          title: this.resolveLocalizedValue({
            locales,
            field: "title",
            requestLanguage,
            fallbackLanguage,
            baseValue: post.title,
          }),
          summary: this.resolveLocalizedValue({
            locales,
            field: "summary",
            requestLanguage,
            fallbackLanguage,
            baseValue: post.summary,
          }),
          content: this.resolveLocalizedValue({
            locales,
            field: "content",
            requestLanguage,
            fallbackLanguage,
            baseValue: post.content,
          }),
          locales,
        });
      },
      (data: BlogPostDetailBase | null) =>
        this.cacheService.setJson(key, data, SHORT_TTL),
      {
        logger: this.logger,
      },
    );
  }

  async getPostBaseById(id: string): Promise<BlogPostDetailBase | null> {
    const requestLanguage = getRequestLanguage();
    const fallbackLanguage = getFallbackLanguage();
    const key = CACHE_KEYS.blog.getPostBaseById(
      id,
      requestLanguage,
      fallbackLanguage,
    );

    return cacheWithDedup<BlogPostDetailBase | null>(
      key,
      () => this.cacheService.getJson<BlogPostDetailBase | null>(key),
      async () => {
        const [post] = await this.db
          .select({
            id: blogPosts.id,
            title: blogPosts.title,
            locales: blogPosts.locales,
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
          .limit(1);

        if (!post) return null;

        const locales = this.normalizeLocaleMap(post.locales);

        return this.mapToPostDetailBase({
          ...post,
          title: this.resolveLocalizedValue({
            locales,
            field: "title",
            requestLanguage,
            fallbackLanguage,
            baseValue: post.title,
          }),
          summary: this.resolveLocalizedValue({
            locales,
            field: "summary",
            requestLanguage,
            fallbackLanguage,
            baseValue: post.summary,
          }),
          content: this.resolveLocalizedValue({
            locales,
            field: "content",
            requestLanguage,
            fallbackLanguage,
            baseValue: post.content,
          }),
          locales,
        });
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
      const now = new Date();
      const [created] = await db
        .insert(blogPosts)
        .values({
          ...data,
          updatedAt: now,
        })
        .returning();

      const normalizedTags = (data.tags ?? []).filter(
        (item) => item.tagId || item.skillId,
      );

      if (normalizedTags.length > 0) {
        await this.updatePostTags(created.id, normalizedTags);
      }

      await this.invalidateBlogCache(created.id, created.slug);
      return created as BlogPost;
    });
  }

  async saveDraft(
    authorId: string,
    data: {
      title?: string;
      summary?: string;
      content?: string;
      locales?: BlogLocaleMap;
      categoryId?: string;
      thumbnail?: string | null;
      tags?: Array<{ tagId?: string | null; skillId?: string | null }>;
    },
    postId?: string,
  ): Promise<BlogPost> {
    return this.executeWithTransaction(async () => {
      const tx = this.getExecutor();

      if (postId) {
        const [existing] = await tx
          .select()
          .from(blogPosts)
          .where(and(eq(blogPosts.id, postId), isNull(blogPosts.deletedAt)))
          .limit(1);

        if (!existing) {
          throw new Error(`Draft blog post ${postId} not found`);
        }

        const finalCategoryId = await this.resolveCategoryId(
          data.categoryId ?? existing.categoryId ?? undefined,
        );

        const updateData: Record<string, unknown> = {
          title: data.title ?? existing.title ?? "Bản nháp không có tiêu đề",
          summary: data.summary ?? existing.summary ?? "",
          content: data.content ?? existing.content ?? "",
          locales: data.locales ?? existing.locales ?? {},
          thumbnail:
            data.thumbnail === undefined ? existing.thumbnail : data.thumbnail,
          categoryId: finalCategoryId,
          status: "DRAFT",
          updatedAt: new Date(),
        };

        const [updated] = await tx
          .update(blogPosts)
          .set(updateData)
          .where(eq(blogPosts.id, postId))
          .returning();

        if (data.tags !== undefined) {
          await this.updatePostTags(postId, data.tags);
        }

        await this.invalidateBlogCache(updated.id, updated.slug);
        return updated as BlogPost;
      } else {
        // Create new draft
        const timestampValue = Date.now();
        const baseSlug = data.title ? generateSlug(data.title) : "draft";
        const slug = `${baseSlug}-${timestampValue}`;
        const finalCategoryId = await this.resolveCategoryId(data.categoryId);

        const now = new Date();
        const insertData: any = {
          title: data.title ?? "Bản nháp không có tiêu đề",
          slug,
          summary: data.summary ?? "",
          content: data.content ?? "",
          locales: data.locales ?? {},
          thumbnail: data.thumbnail ?? null,
          status: "DRAFT",
          sourceType: "USER",
          categoryId: finalCategoryId,
          authorId,
          updatedAt: now,
        };

        const [created] = await tx
          .insert(blogPosts)
          .values(insertData)
          .returning();

        const normalizedTags = (data.tags ?? []).filter(
          (item) => item.tagId || item.skillId,
        );

        if (normalizedTags.length > 0) {
          await this.updatePostTags(created.id, normalizedTags);
        }

        await this.invalidateBlogCache(created.id, created.slug);
        return created as BlogPost;
      }
    });
  }

  async resolveCategoryId(categoryId?: string): Promise<string> {
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

  async updatePost(
    postId: string,
    data: {
      title?: string;
      summary?: string;
      content?: string;
      locales?: BlogLocaleMap;
      categoryId?: string;
      thumbnail?: string | null;
      tags?: Array<{ tagId?: string | null; skillId?: string | null }>;
      status?: BlogPostStatus;
      slug?: string;
    },
  ): Promise<BlogPost> {
    return this.executeWithTransaction(async () => {
      const tx = this.getExecutor();
      const updateData: Record<string, unknown> = { updatedAt: new Date() };

      if (data.title !== undefined) updateData.title = data.title;
      if (data.summary !== undefined) updateData.summary = data.summary;
      if (data.content !== undefined) updateData.content = data.content;
      if (data.locales !== undefined) updateData.locales = data.locales;
      if (data.categoryId !== undefined)
        updateData.categoryId = data.categoryId;
      if (data.thumbnail !== undefined) updateData.thumbnail = data.thumbnail;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.slug !== undefined) updateData.slug = data.slug;

      const [updated] = await tx
        .update(blogPosts)
        .set(updateData)
        .where(and(eq(blogPosts.id, postId), isNull(blogPosts.deletedAt)))
        .returning();

      if (!updated) {
        throw new Error(`Blog post ${postId} not found`);
      }

      if (data.tags !== undefined) {
        await this.updatePostTags(postId, data.tags);
      }

      await this.invalidateBlogCache(updated.id, updated.slug);
      return updated as BlogPost;
    });
  }

  async deletePost(postId: string): Promise<void> {
    const [deleted] = await this.db
      .update(blogPosts)
      .set({ deletedAt: new Date() })
      .where(and(eq(blogPosts.id, postId), isNull(blogPosts.deletedAt)))
      .returning();

    if (deleted) {
      await this.invalidateBlogCache(deleted.id, deleted.slug);
    }
  }
}
