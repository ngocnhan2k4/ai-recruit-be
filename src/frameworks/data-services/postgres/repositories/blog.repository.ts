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
import { type DBDrizzle, type DBDrizzleTransaction } from "../types";
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
} from "drizzle-orm";
import { skills, users } from "../models";
import { PaginatedResult } from "@/common/types";
import {
  BlogPostDetailBase,
  BlogPostFilters,
  BlogPostListItem,
  BlogPostTagItem,
} from "@/core/entities/blog.entity";
import { BlogPost, BlogPostStatus, NewBlogPost, NewBlogPostTag } from "@/core";
import { generateSlug } from "@/common/utils/string";

@Injectable()
export class BlogRepository
  extends GenericRepository<BlogPost, typeof blogPosts>
  implements IBlogRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, blogPosts);
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

  private buildPostWhere(filters: BlogPostFilters) {
    const conditions: SQL[] = [];

    if (filters.keyword) {
      conditions.push(ilike(blogPosts.title, `%${filters.keyword}%`));
    }

    if (filters.category) {
      conditions.push(eq(blogPosts.categoryId, filters.category));
    }

    if (filters.status) {
      conditions.push(eq(blogPosts.status, filters.status));
    }

    return conditions.length ? and(...conditions) : undefined;
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
    const limit = Math.min(filters.limit ?? 10, 50);
    const page = Math.max(filters.page ?? 1, 1);
    const offset = (page - 1) * limit;
    const whereClause = this.buildPostWhere(filters);

    const rowsQuery = this.db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        summary: blogPosts.summary,
        thumbnail: blogPosts.thumbnail,
        category: blogPosts.categoryId,
        createdAt: blogPosts.createdAt,
        status: sql<BlogPostStatus>`${blogPosts.status}`,
      })
      .from(blogPosts)
      .where(whereClause)
      .orderBy(desc(blogPosts.createdAt))
      .limit(limit)
      .offset(offset);

    const totalQuery = this.db
      .select({ total: count(blogPosts.id) })
      .from(blogPosts)
      .where(whereClause);

    const [rows, totalRows] = await Promise.all([rowsQuery, totalQuery]);

    const total = Number(totalRows[0]?.total ?? 0);
    const translatedMap = await this.getPostTranslationsMap(
      rows.map((item) => item.id),
      requestLanguage,
      fallbackLanguage,
    );

    return {
      data: rows.map((item) => ({
        ...item,
        title: translatedMap[item.id]?.title || item.title,
        summary: translatedMap[item.id]?.summary || item.summary,
      })),
      pagination: {
        total,
        hasNextPage: offset + rows.length < total,
      },
    };
  }

  async getMyBlogs(
    authorId: string,
    filters: BlogPostFilters,
    requestLanguage = "vi",
    fallbackLanguage = "vi",
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
          status: sql<BlogPostStatus>`${blogPosts.status}`,
        })
        .from(blogPosts)
        .where(whereClause)
        .orderBy(desc(blogPosts.createdAt))
        .limit(limit)
        .offset(offset),
      this.db
        .select({ total: count(blogPosts.id) })
        .from(blogPosts)
        .where(whereClause),
    ]);

    const total = Number(totalRows[0]?.total ?? 0);
    const translatedMap = await this.getPostTranslationsMap(
      rows.map((item) => item.id),
      requestLanguage,
      fallbackLanguage,
    );

    return {
      data: rows.map((item) => ({
        ...item,
        title: translatedMap[item.id]?.title || item.title,
        summary: translatedMap[item.id]?.summary || item.summary,
      })),
      pagination: {
        total,
        hasNextPage: offset + rows.length < total,
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
        if (!acc[tag.postId]) {
          acc[tag.postId] = [];
        }

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
        createdAt: blogPosts.createdAt,
        authorId: users.id,
        authorUsername: users.username,
        authorName: users.name,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(blogPosts)
      .innerJoin(users, eq(users.id, blogPosts.authorId))
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

    const translatedMap = await this.getPostTranslationsMap(
      [post.id],
      requestLanguage,
      fallbackLanguage,
    );
    const translated = translatedMap[post.id];

    return {
      id: post.id,
      title: translated?.title || post.title,
      slug: post.slug,
      summary: translated?.summary || post.summary,
      thumbnail: post.thumbnail,
      content: translated?.content || post.content,
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
    return this.executeWithTransaction(async () => {
      const db = this.getExecutor();
      const [created] = await db.insert(blogPosts).values(data).returning();

      const normalizedTags = (data.tags ?? []).filter(
        (item) => item.tagId || item.skillId,
      );

      if (normalizedTags.length > 0) {
        const tagRows: NewBlogPostTag[] = normalizedTags.map((item) => ({
          postId: created.id,
          tagId: item.tagId ?? null,
          skillId: item.skillId ?? null,
        }));

        await db.insert(blogPostTags).values(tagRows);
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
    tx?: DBDrizzleTransaction,
  ): Promise<BlogPost> {
    return (tx ?? this.db).transaction(async (tx) => {
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

  async incrementViewCount(
    data: { postId: string; viewCount: number }[],
  ): Promise<void> {
    if (data.length === 0) {
      return;
    }

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
}
