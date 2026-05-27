import { Controller, Get, Headers, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CommentUseCases } from "@/use-cases/comment/comment.use-case";
import { QueryCommentsDto } from "@/interfaces/dtos/comment/req/comment.dto";

@ApiTags("Comments")
@Controller("comments")
export class CommentController {
  constructor(private readonly commentUseCases: CommentUseCases) {}

  @Get()
  @ApiOperation({ summary: "Get comments for an object" })
  async getComments(
    @Query() query: QueryCommentsDto,
    @Headers("accept-language") acceptLanguage?: string,
  ) {
    return this.commentUseCases.getComments(query, acceptLanguage);
  }
}
