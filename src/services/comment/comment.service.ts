import { Injectable, BadRequestException } from "@nestjs/common";
import { ICommentRepository } from "@/core/abstracts/repositories/comment-repository.abstract";
import { RESPONSE_CODE } from "@/common/constants";

@Injectable()
export class CommentService {
  constructor(private readonly commentRepository: ICommentRepository) {}

  async validateCommentHierarchy(
    parentCommentId: string | null,
    objectId: string,
  ): Promise<{ parentCommentId: string | null; rootCommentId: string | null }> {
    let rootCommentId: string | null = null;

    if (parentCommentId) {
      const parent = await this.commentRepository.get(parentCommentId);
      if (!parent || parent.objectId !== objectId) {
        throw new BadRequestException({
          code: RESPONSE_CODE.INVALID_REQUEST,
          message: "Parent comment does not belong to this object",
        });
      }

      rootCommentId = parent.rootCommentId || parent.id;
      if (parent.rootCommentId) {
        const root = await this.commentRepository.get(parent.rootCommentId);
        if (!root || root.objectId !== objectId) {
          throw new BadRequestException({
            code: RESPONSE_CODE.INVALID_REQUEST,
            message: "Root comment does not belong to this object",
          });
        }
      }
    }

    return { parentCommentId, rootCommentId };
  }
}
