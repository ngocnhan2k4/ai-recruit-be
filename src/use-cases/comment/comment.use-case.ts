import { Injectable } from "@nestjs/common";
import { ICommentRepository } from "@/core/abstracts/repositories/comment-repository.abstract";
import { ApiResponse } from "@/interfaces/dtos";
import { PaginatedResult } from "@/common/types";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { CommentWithAuthor } from "@/core/entities";
import { QueryCommentsDto } from "@/interfaces/dtos/comment/req/comment.dto";
import { resolveLanguageContext } from "@/common/utils";

@Injectable()
export class CommentUseCases {
  constructor(private readonly commentRepository: ICommentRepository) {}

  async getComments(
    query: QueryCommentsDto,
  ): Promise<ApiResponse<PaginatedResult<CommentWithAuthor>>> {
    const { requestLanguage: lang } = resolveLanguageContext();
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
}
