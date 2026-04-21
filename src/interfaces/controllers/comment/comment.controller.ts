import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CommentUseCases } from "@/use-cases/comment/comment.use-case";
import { QueryCommentsDto } from "@/interfaces/dtos/comment/req/comment.dto";

@ApiTags("Comments")
@Controller("comments")
export class CommentController {
  constructor(private readonly commentUseCases: CommentUseCases) {}

  @Get()
  @ApiOperation({ summary: "Get top-level comments for an object" })
  async getComments(@Query() query: QueryCommentsDto) {
    return this.commentUseCases.getComments(query);
  }

  @Get("children")
  @ApiOperation({ summary: "Get children comments for a parent comment" })
  async getChildrenComments(@Query() query: QueryCommentsDto) {
    return this.commentUseCases.getChildrenComments(query);
  }
}
