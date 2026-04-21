import { PaginatedResult } from "@/common/types";
import { Comment, ObjectType } from "@/core/entities";
import { CommentWithAuthor } from "@/core/entities/comment.entity";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class ICommentRepository extends IGenericRepository<Comment> {
  abstract getComments(params: {
    objectId: string;
    objectType: ObjectType;
    parentId?: string | null;
    limit: number;
    cursor?: string;
  }): Promise<PaginatedResult<CommentWithAuthor>>;
}
