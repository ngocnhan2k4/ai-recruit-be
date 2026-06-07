import { RESPONSE_CODE } from "@/common/constants";
import { ICommentRepository } from "@/core/abstracts/repositories/comment-repository.abstract";
import { BadRequestException, Injectable } from "@nestjs/common";

export const MAX_COMMENT_DEPTH = 2;

@Injectable()
export class CommentService {
  constructor(private readonly commentRepository: ICommentRepository) {}

  async resolveCommentPlacement(
    parentCommentId: string | null,
    objectId: string,
  ): Promise<{
    actualParentId: string | null;
    rootCommentId: string | null;
    depth: number;
  }> {
    if (!parentCommentId) {
      return {
        actualParentId: null,
        rootCommentId: null,
        depth: 0,
      };
    }

    const parent = await this.commentRepository.get(parentCommentId);
    if (parent?.objectId !== objectId) {
      throw new BadRequestException({
        code: RESPONSE_CODE.INVALID_REQUEST,
        message: "Parent comment does not belong to this object",
      });
    }

    let actualParentId = parent.id;
    let depth = (parent.depth ?? 0) + 1;
    const rootCommentId = parent.rootCommentId || parent.id;

    if (depth > MAX_COMMENT_DEPTH) {
      actualParentId = parent.parentCommentId!;
      depth = MAX_COMMENT_DEPTH;
    }

    if (rootCommentId) {
      const root = await this.commentRepository.get(rootCommentId);
      if (root?.objectId !== objectId) {
        throw new BadRequestException({
          code: RESPONSE_CODE.INVALID_REQUEST,
          message: "Root comment does not belong to this object",
        });
      }
    }

    return {
      actualParentId,
      rootCommentId,
      depth,
    };
  }
}
