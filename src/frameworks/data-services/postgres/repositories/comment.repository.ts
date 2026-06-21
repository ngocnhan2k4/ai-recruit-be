import { PaginatedResult } from "@/common/types";
import { ICommentRepository } from "@/core/abstracts/repositories/comment-repository.abstract";
import { Comment, CommentWithAuthor, ObjectType } from "@/core/entities";
import { and, count, desc, eq, isNull, lt, sql } from "drizzle-orm";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { comments, users } from "../models";
import { type DBDrizzle } from "../types";

@Injectable()
export class CommentRepository
  extends GenericRepository<Comment, typeof comments>
  implements ICommentRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, comments);
  }

  async getComments(params: {
    objectId: string;
    objectType: ObjectType;
    parentCommentId?: string | null;
    limit: number;
    cursor?: string;
  }): Promise<PaginatedResult<CommentWithAuthor>> {
    const { objectId, objectType, parentCommentId, limit, cursor } = params;

    const conditions = [
      eq(comments.objectId, objectId),
      eq(comments.objectType, objectType),
      parentCommentId
        ? eq(comments.parentCommentId, parentCommentId)
        : isNull(comments.parentCommentId),
    ];

    if (cursor) {
      conditions.push(lt(comments.createdAt, new Date(cursor)));
    }

    const childCountSq = this.db
      .select({
        parentId: comments.parentCommentId,
        count: count(comments.id).as("count"),
      })
      .from(comments)
      .where(
        and(
          eq(comments.objectId, objectId),
          eq(comments.objectType, objectType),
        ),
      )
      .groupBy(comments.parentCommentId)
      .as("child_counts");

    const rows = await this.db
      .select({
        id: comments.id,
        content: comments.content,
        authorId: comments.authorId,
        parentCommentId: comments.parentCommentId,
        depth: comments.depth,
        objectId: comments.objectId,
        objectType: comments.objectType,
        createdAt: comments.createdAt,
        author: {
          id: users.id,
          username: users.username,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
        childCount: sql<number>`COALESCE(${childCountSq.count}, 0)::int`,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.authorId))
      .leftJoin(childCountSq, eq(childCountSq.parentId, comments.id))
      .where(and(...conditions))
      .orderBy(desc(comments.createdAt))
      .limit(limit + 1);

    const [{ count: totalCount }] = await this.db
      .select({ count: count() })
      .from(comments)
      .where(
        and(
          eq(comments.objectId, objectId),
          eq(comments.objectType, objectType),
          parentCommentId
            ? eq(comments.parentCommentId, parentCommentId)
            : isNull(comments.parentCommentId),
        ),
      );

    const hasNextPage = rows.length > limit;
    const rawData = hasNextPage ? rows.slice(0, limit) : rows;
    const lastItem = rawData.at(-1);

    return {
      data: rawData,
      pagination: {
        nextCursor:
          hasNextPage && lastItem?.createdAt
            ? lastItem.createdAt.toISOString()
            : null,
        hasNextPage,
        total: totalCount,
      },
    };
  }

  async getComment(id: string): Promise<CommentWithAuthor | null> {
    const childCountSq = this.db
      .select({
        parentId: comments.parentCommentId,
        count: count(comments.id).as("count"),
      })
      .from(comments)
      .groupBy(comments.parentCommentId)
      .as("child_counts");

    const rows = await this.db
      .select({
        id: comments.id,
        content: comments.content,
        authorId: comments.authorId,
        parentCommentId: comments.parentCommentId,
        depth: comments.depth,
        objectId: comments.objectId,
        objectType: comments.objectType,
        createdAt: comments.createdAt,
        author: {
          id: users.id,
          username: users.username,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
        childCount: sql<number>`COALESCE(${childCountSq.count}, 0)::int`,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.authorId))
      .leftJoin(childCountSq, eq(childCountSq.parentId, comments.id))
      .where(eq(comments.id, id));

    return rows[0] || null;
  }
}
