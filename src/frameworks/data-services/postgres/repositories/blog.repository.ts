import { PaginatedResult } from "@/common/types";
import {
  BlogCommentItem,
  BlogLikeResult,
  BlogPostDetail,
  BlogPostFilters,
  BlogPostListItem,
} from "@/core/entities/blog.entity";
import {
  BlogComment,
  BlogPost,
  NewBlogPost,
  NewBlogPostTag,
} from "@/core/entities";
import { IBlogRepository } from "@/core/abstracts/repositories/blog-repository.abstract";
import { Inject, Injectable, NotFoundException } from "@nestjs/common";
import { and, count, desc, eq, ilike, sql, SQL } from "drizzle-orm";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { GenericRepository } from "./generic-repository";
import { type DBDrizzle } from "../types";
import { users } from "../models";
import {
  blogComments,
  blogLikes,
  blogPosts,
  blogPostTags,
} from "../models/blog.model";

@Injectable()
export class BlogRepository
  extends GenericRepository<BlogPost, typeof blogPosts>
  implements IBlogRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, blogPosts);
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
          likes: count(blogLikes.id),
        })
        .from(blogPosts)
        .leftJoin(blogLikes, eq(blogLikes.postId, blogPosts.id))
        .where(whereClause)
        .groupBy(
          blogPosts.id,
          blogPosts.title,
          blogPosts.slug,
          blogPosts.summary,
          blogPosts.thumbnail,
          blogPosts.categoryId,
          blogPosts.createdAt,
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

    return {
      data: rows.map((row) => ({
        id: row.id,
        title: row.title,
        slug: row.slug,
        summary: row.summary,
        thumbnail: row.thumbnail,
        category: row.category,
        createdAt: row.createdAt,
        likes: Number(row.likes ?? 0),
      })),
      pagination: {
        total,
        hasNextPage: offset + rows.length < total,
      },
    };
  }

  async getPostDetailBySlug(slug: string): Promise<BlogPostDetail | null> {
    const [post] = await this.db
      .select({
        id: blogPosts.id,
        title: blogPosts.title,
        slug: blogPosts.slug,
        summary: blogPosts.summary,
        thumbnail: blogPosts.thumbnail,
        content: blogPosts.content,
        category: blogPosts.categoryId,
        viewCount: blogPosts.viewCount,
        createdAt: blogPosts.createdAt,
        authorId: users.id,
        authorUsername: users.username,
        authorName: users.name,
        authorAvatarUrl: users.avatarUrl,
        likes: count(blogLikes.id),
      })
      .from(blogPosts)
      .innerJoin(users, eq(users.id, blogPosts.authorId))
      .leftJoin(blogLikes, eq(blogLikes.postId, blogPosts.id))
      .where(eq(blogPosts.slug, slug))
      .groupBy(
        blogPosts.id,
        blogPosts.title,
        blogPosts.slug,
        blogPosts.summary,
        blogPosts.thumbnail,
        blogPosts.content,
        blogPosts.categoryId,
        blogPosts.viewCount,
        blogPosts.createdAt,
        users.id,
        users.username,
        users.name,
        users.avatarUrl,
      )
      .limit(1);

    if (!post) return null;

    const comments = await this.db
      .select({
        id: blogComments.id,
        content: blogComments.content,
        createdAt: blogComments.createdAt,
        authorId: users.id,
        authorUsername: users.username,
        authorName: users.name,
        authorAvatarUrl: users.avatarUrl,
      })
      .from(blogComments)
      .innerJoin(users, eq(users.id, blogComments.authorId))
      .where(eq(blogComments.postId, post.id))
      .orderBy(desc(blogComments.createdAt));

    return {
      id: post.id,
      title: post.title,
      slug: post.slug,
      summary: post.summary,
      thumbnail: post.thumbnail,
      content: post.content,
      category: post.category,
      viewCount: post.viewCount,
      createdAt: post.createdAt,
      author: {
        id: post.authorId,
        username: post.authorUsername,
        name: post.authorName,
        avatarUrl: post.authorAvatarUrl,
      },
      comments: comments.map((comment) => ({
        id: comment.id,
        content: comment.content,
        createdAt: comment.createdAt,
        author: {
          id: comment.authorId,
          username: comment.authorUsername,
          name: comment.authorName,
          avatarUrl: comment.authorAvatarUrl,
        },
      })),
      likes: Number(post.likes ?? 0),
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

  async updatePostBySlug(
    slug: string,
    authorId: string,
    data: Partial<BlogPost>,
  ): Promise<BlogPost | null> {
    const [updated] = await this.db
      .update(blogPosts)
      .set(data)
      .where(and(eq(blogPosts.slug, slug), eq(blogPosts.authorId, authorId)))
      .returning();

    return (updated as BlogPost) ?? null;
  }

  async deletePostBySlug(slug: string, authorId: string): Promise<boolean> {
    const deleted = await this.db
      .delete(blogPosts)
      .where(and(eq(blogPosts.slug, slug), eq(blogPosts.authorId, authorId)))
      .returning({ id: blogPosts.id });

    return deleted.length > 0;
  }

  async createComment(data: {
    postId: string;
    authorId: string;
    content: string;
  }): Promise<BlogCommentItem> {
    const [created] = await this.db
      .insert(blogComments)
      .values(data)
      .returning({
        id: blogComments.id,
        content: blogComments.content,
        createdAt: blogComments.createdAt,
        authorId: blogComments.authorId,
      });

    const [author] = await this.db
      .select({
        id: users.id,
        username: users.username,
        name: users.name,
        avatarUrl: users.avatarUrl,
      })
      .from(users)
      .where(eq(users.id, data.authorId))
      .limit(1);

    return {
      id: created.id,
      content: created.content,
      createdAt: created.createdAt,
      author: {
        id: author?.id ?? data.authorId,
        username: author?.username ?? "",
        name: author?.name ?? "",
        avatarUrl: author?.avatarUrl ?? null,
      },
    };
  }

  async getCommentById(commentId: string): Promise<BlogComment | null> {
    const [comment] = await this.db
      .select()
      .from(blogComments)
      .where(eq(blogComments.id, commentId))
      .limit(1);

    return (comment as BlogComment) ?? null;
  }

  async deleteCommentById(
    commentId: string,
    authorId: string,
  ): Promise<boolean> {
    const deleted = await this.db
      .delete(blogComments)
      .where(
        and(
          eq(blogComments.id, commentId),
          eq(blogComments.authorId, authorId),
        ),
      )
      .returning({ id: blogComments.id });

    return deleted.length > 0;
  }

  async toggleLike(postId: string, userId: string): Promise<BlogLikeResult> {
    const [post] = await this.db
      .select({ id: blogPosts.id })
      .from(blogPosts)
      .where(eq(blogPosts.id, postId))
      .limit(1);

    if (!post) {
      throw new NotFoundException({
        code: RESPONSE_CODE.JOB_NOT_FOUND,
        message: RESPONSE_MESSAGE.JOB_NOT_FOUND,
      });
    }

    const [existing] = await this.db
      .select({ id: blogLikes.id })
      .from(blogLikes)
      .where(and(eq(blogLikes.postId, postId), eq(blogLikes.userId, userId)))
      .limit(1);

    if (existing) {
      await this.db.delete(blogLikes).where(eq(blogLikes.id, existing.id));
      return { liked: false };
    }

    await this.db.insert(blogLikes).values({ postId, userId });
    return { liked: true };
  }

  async incrementViewCount(postId: string): Promise<void> {
    await this.db
      .update(blogPosts)
      .set({ viewCount: sql`${blogPosts.viewCount} + 1` })
      .where(eq(blogPosts.id, postId));
  }
}
