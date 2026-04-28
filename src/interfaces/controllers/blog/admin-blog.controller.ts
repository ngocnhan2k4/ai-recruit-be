import {
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards/system-authorize.guard";
import { BlogUseCases } from "@/use-cases/blog/blog.use-case";
import { QueryBlogsDto } from "@/interfaces/dtos/blog/req";
import { Controller, Get, Param, Put, Query, UseGuards } from "@nestjs/common";

@ApiTags("Admin - Blog System")
@ApiBearerAuth()
@Controller("admin/blog")
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
export class AdminBlogController {
  constructor(private readonly blogUseCases: BlogUseCases) {}

  @ApiOperation({
    summary: "Get all blogs (excluding DRAFT)",
    description:
      "Get a paginated list of blogs for admin. Excludes DRAFT status.",
  })
  @Get()
  async getAdminBlogs(@Query() query: QueryBlogsDto) {
    return this.blogUseCases.getAdminBlogs(query);
  }

  @ApiOperation({
    summary: "Get blog detail by ID",
    description: "Retrieve blog detail for admin. Excludes DRAFT status.",
  })
  @ApiParam({ name: "id", description: "Blog post ID" })
  @Get(":id")
  async getAdminBlogById(@Param("id") id: string) {
    return this.blogUseCases.getAdminBlogById(id);
  }

  @ApiOperation({
    summary: "Approve a pending or rejected blog post",
    description:
      "Changes a blog post status to PUBLISHED. Cannot be used on DRAFT.",
  })
  @ApiParam({ name: "id", description: "Blog post ID" })
  @Put(":id/approve")
  async approvePost(@Param("id") id: string) {
    return this.blogUseCases.approvePost(id);
  }

  @ApiOperation({
    summary: "Reject a pending or published blog post",
    description:
      "Changes a blog post status to REJECTED. Cannot be used on DRAFT.",
  })
  @ApiParam({ name: "id", description: "Blog post ID" })
  @Put(":id/reject")
  async rejectPost(@Param("id") id: string) {
    return this.blogUseCases.rejectPost(id);
  }
}
