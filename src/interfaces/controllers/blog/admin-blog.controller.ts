import { GetUser } from "@/common/decorators";
import type { TokenPayload } from "@/common/types";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards/system-authorize.guard";
import { ApiResponse } from "@/interfaces/dtos";
import {
  CreateBlogCategoryDto,
  CreateBlogPostDto,
  CreateBlogTagDto,
  QueryBlogCategoriesDto,
  QueryBlogsDto,
  QueryBlogTagsDto,
  SaveDraftBlogPostDto,
  UpdateBlogPostDto,
  UpdateBlogStatusRequest,
} from "@/interfaces/dtos/blog/req";
import { BlogPostDetailDto } from "@/interfaces/dtos/blog/res/blog-post.dto";
import { BlogUseCases } from "@/use-cases/blog/blog.use-case";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

@ApiTags("Admin - Blog System")
@ApiBearerAuth()
@Controller("admin/blog")
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
export class AdminBlogController {
  constructor(private readonly blogUseCases: BlogUseCases) {}

  @ApiOperation({
    summary: "Get all blogs",
    description:
      "Get a paginated list of blogs for admin. Includes ALL statuses (DRAFT, PENDING, PUBLISHED, REJECTED). Filter by status query param.",
  })
  @Get()
  async getAdminBlogs(@Query() query: QueryBlogsDto) {
    return this.blogUseCases.getAdminBlogs(query);
  }

  @ApiOperation({
    summary: "Get blog detail by ID",
    description: "Retrieve blog detail for admin including DRAFT status.",
  })
  @ApiParam({ name: "id", description: "Blog post ID" })
  @Get(":id")
  async getAdminBlogById(
    @Param("id") id: string,
  ): Promise<ApiResponse<BlogPostDetailDto>> {
    return this.blogUseCases.getAdminBlogById(id);
  }

  @ApiOperation({
    summary: "Create and publish a blog post",
    description:
      "Admin creates a new blog post and immediately publishes it (status = PUBLISHED, sourceType = ADMIN).",
  })
  @Post()
  async createPost(
    @GetUser() admin: TokenPayload,
    @Body() dto: CreateBlogPostDto,
  ): Promise<ApiResponse<{ slug: string }>> {
    return this.blogUseCases.adminCreatePost(admin.userId, dto);
  }

  @ApiOperation({
    summary: "Save a blog post as draft",
    description:
      "Admin saves a blog post as draft. Without postId creates a new draft; with postId updates the existing draft.",
  })
  @ApiQuery({
    name: "postId",
    required: false,
    description: "ID of an existing draft to update",
  })
  @Post("draft")
  async saveDraft(
    @GetUser() admin: TokenPayload,
    @Body() dto: SaveDraftBlogPostDto,
    @Query("postId") postId?: string,
  ): Promise<ApiResponse<{ id: string; slug: string }>> {
    return this.blogUseCases.adminSaveDraft(admin.userId, dto, postId);
  }

  @ApiOperation({
    summary: "Update a blog post",
    description:
      "Admin updates any blog post fields (title, content, category, tags, thumbnail). No author check.",
  })
  @ApiParam({ name: "id", description: "Blog post ID" })
  @Put(":id")
  async updatePost(
    @Param("id") id: string,
    @Body() dto: UpdateBlogPostDto,
  ): Promise<ApiResponse<{ id: string }>> {
    return this.blogUseCases.adminUpdatePost(id, dto);
  }

  @ApiOperation({
    summary: "Delete a blog post",
    description: "Admin soft-deletes any blog post regardless of author.",
  })
  @ApiParam({ name: "id", description: "Blog post ID" })
  @Delete(":id")
  async deletePost(@Param("id") id: string): Promise<ApiResponse<void>> {
    return this.blogUseCases.adminDeletePost(id);
  }

  // ─── Review (CRAWLED / AI posts) ─────────────────────────────────────────

  @ApiOperation({
    summary: "Update blog status (review)",
    description:
      "Approve or reject a blog post. Used to review CRAWLED and AI-generated posts. Changes status to PUBLISHED (approved) or REJECTED. Cannot be used on DRAFT.",
  })
  @ApiParam({ name: "id", description: "Blog post ID" })
  @Put(":id/status")
  async updateBlogStatus(
    @Param("id") id: string,
    @Body() request: UpdateBlogStatusRequest,
  ) {
    return this.blogUseCases.updateBlogStatus(id, request);
  }

  @ApiOperation({
    summary: "Create a blog category",
    description: "Create a new blog category.",
  })
  @Post("categories")
  async createCategory(@Body() body: CreateBlogCategoryDto) {
    return this.blogUseCases.createCategory(body);
  }

  @ApiOperation({
    summary: "Get paginated categories",
    description: "Retrieve a paginated list of blog categories.",
  })
  @Get("categories")
  async getCategories(@Query() query: QueryBlogCategoriesDto) {
    return this.blogUseCases.getCategoriesPaginated(query);
  }

  @ApiOperation({
    summary: "Create a blog tag",
    description: "Create a new blog tag.",
  })
  @Post("tags")
  async createTag(@Body() body: CreateBlogTagDto) {
    return this.blogUseCases.createTag(body);
  }

  @ApiOperation({
    summary: "Get paginated tags",
    description: "Retrieve a paginated list of blog tags.",
  })
  @Get("tags")
  async getTags(@Query() query: QueryBlogTagsDto) {
    return this.blogUseCases.getTagsPaginated(query);
  }
}
