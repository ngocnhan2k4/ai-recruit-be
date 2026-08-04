import { RESPONSE_CODE, MAX_COMMENT_DEPTH } from "@/common/constants";
import { ICommentRepository } from "@/core/abstracts/repositories/comment-repository.abstract";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

@Injectable()
export class CommentService {
  constructor(private readonly commentRepository: ICommentRepository) {}

  async resolveCommentParent(
    targetCommentId: string | null,
    objectId: string,
  ): Promise<{ parentCommentId: string | null; depth: number }> {
    if (!targetCommentId) {
      return { parentCommentId: null, depth: 0 };
    }

    const parent = await this.commentRepository.get(targetCommentId);

    if (!parent) {
      throw new NotFoundException({
        code: RESPONSE_CODE.INVALID_REQUEST,
        message: "Parent comment not found",
      });
    }

    if (parent.objectId !== objectId) {
      throw new BadRequestException({
        code: RESPONSE_CODE.INVALID_REQUEST,
        message: "Parent comment does not belong to this object",
      });
    }

    if (parent.depth < MAX_COMMENT_DEPTH) {
      return { parentCommentId: parent.id, depth: parent.depth + 1 };
    }

    return {
      parentCommentId: parent.parentCommentId,
      depth: MAX_COMMENT_DEPTH,
    };
  }
}
