import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { PaginatedResult } from "@/common/types";
import { ICommentRepository } from "@/core/abstracts/repositories/comment-repository.abstract";
import { CommentWithAuthor } from "@/core/entities";
import { ApiResponse } from "@/interfaces/dtos";
import { QueryCommentsDto } from "@/interfaces/dtos/comment/req/comment.dto";
import { Injectable } from "@nestjs/common";

@Injectable()
export class CommentUseCases {
  constructor(private readonly commentRepository: ICommentRepository) {}

  async getComments(
    query: QueryCommentsDto,
  ): Promise<ApiResponse<PaginatedResult<CommentWithAuthor>>> {
    const limit = Math.min(query.limit ?? 10, 50);
    const result = await this.commentRepository.getComments({
      objectId: query.objectId,
      objectType: query.objectType,
      parentId: query.parentId,
      limit,
      cursor: query.cursor,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: result,
    };
  }
}
