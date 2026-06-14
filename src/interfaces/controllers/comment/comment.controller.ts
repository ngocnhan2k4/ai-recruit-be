import { Controller, Get, Param, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { CommentUseCases } from "@/use-cases/comment/comment.use-case";
import { QueryCommentsDto } from "@/interfaces/dtos/comment/req/comment.dto";

@ApiTags("Comments")
@Controller("comments")
export class CommentController {
  constructor(private readonly commentUseCases: CommentUseCases) {}

  @Get()
  @ApiOperation({ summary: "Get comments for an object" })
  async getComments(@Query() query: QueryCommentsDto) {
    return this.commentUseCases.getComments(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single comment by ID" })
  async getComment(@Param("id") id: string) {
    return this.commentUseCases.getComment(id);
  }
}
