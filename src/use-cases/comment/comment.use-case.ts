import { Injectable } from "@nestjs/common";
import { ICommentRepository } from "@/core/abstracts/repositories/comment-repository.abstract";
import { ApiResponse } from "@/interfaces/dtos";
import { PaginatedResult } from "@/common/types";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { CommentWithAuthor } from "@/core/entities";
import { QueryCommentsDto } from "@/interfaces/dtos/comment/req/comment.dto";
import { getRequestLanguage } from "@/common/utils";

@Injectable()
export class CommentUseCases {
  constructor(private readonly commentRepository: ICommentRepository) {}

  async getComments(
    query: QueryCommentsDto,
  ): Promise<ApiResponse<PaginatedResult<CommentWithAuthor>>> {
    const lang = getRequestLanguage();
    const limit = Math.min(query.limit ?? 10, 50);
    const result = await this.commentRepository.getComments({
      objectId: query.objectId,
      objectType: query.objectType,
      parentCommentId: query.parentCommentId,
      limit,
      cursor: query.cursor,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        ...result,
        data: result.data.map((comment) => ({
          ...comment,
          canTranslate: comment.languageCode !== lang,
          can_translate: comment.languageCode !== lang,
        })),
      },
    };
  }

  async getComment(id: string): Promise<ApiResponse<CommentWithAuthor | null>> {
    const result = await this.commentRepository.getComment(id);
    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: result,
    };
  }
}
