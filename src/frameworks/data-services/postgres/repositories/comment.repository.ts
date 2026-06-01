import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { comments, users } from "../models";
import { ICommentRepository } from "@/core/abstracts/repositories/comment-repository.abstract";
import { Comment, CommentWithAuthor, ObjectType } from "@/core/entities";
import { and, count, desc, eq, lt, sql, isNull } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { PaginatedResult } from "@/common/types";
import { GenericRepository } from "./generic-repository";

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
        ? eq(comments.rootCommentId, parentCommentId)
        : isNull(comments.rootCommentId),
    ];

    if (cursor) {
      conditions.push(lt(comments.createdAt, new Date(cursor)));
    }

    // Subquery to count children
    const childCountSq = this.db
      .select({
        parentId: comments.rootCommentId,
        count: count(comments.id).as("count"),
      })
      .from(comments)
      .where(
        and(
          eq(comments.objectId, objectId),
          eq(comments.objectType, objectType),
        ),
      )
      .groupBy(comments.rootCommentId)
      .as("child_counts");

    const parentComments = alias(comments, "parent_comments") as any;
    const parentUsers = alias(users, "parent_users") as any;

    const rows = await this.db
      .select({
        id: comments.id,
        content: comments.content,
        languageCode: comments.languageCode,
        authorId: comments.authorId,
        parentCommentId: comments.parentCommentId,
        rootCommentId: comments.rootCommentId,
        objectId: comments.objectId,
        objectType: comments.objectType,
        createdAt: comments.createdAt,
        author: {
          id: users.id,
          username: users.username,
          name: users.name,
          avatarUrl: users.avatarUrl,
        },
        replyToComment: {
          id: parentComments.id,
          content: parentComments.content,
          authorId: parentComments.authorId,
          authorName: parentUsers.name,
        },
        childCount: sql<number>`COALESCE(${childCountSq.count}, 0)::int`,
      })
      .from(comments)
      .innerJoin(users, eq(users.id, comments.authorId))
      .leftJoin(parentComments, eq(parentComments.id, comments.parentCommentId))
      .leftJoin(parentUsers, eq(parentUsers.id, parentComments.authorId))
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
            ? eq(comments.rootCommentId, parentCommentId)
            : isNull(comments.rootCommentId),
        ),
      );

    const hasNextPage = rows.length > limit;
    const rawData = hasNextPage ? rows.slice(0, limit) : rows;
    const lastItem = rawData[rawData.length - 1];

    const data = rawData.map((row) => ({
      ...row,
      replyToComment: row.replyToComment?.id ? row.replyToComment : null,
    }));

    return {
      data: data as CommentWithAuthor[],
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
}
