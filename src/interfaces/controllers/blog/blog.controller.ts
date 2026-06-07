import { BlogUseCases } from "@/use-cases/blog/blog.use-case";
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from "@nestjs/swagger";
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from "@/frameworks/auth-services/guards";
import { GetUser } from "@/common/decorators";
import type { PaginatedResult, TokenPayload } from "@/common/types";
import {
  QueryBlogsDto,
  CreateBlogPostDto,
  SaveDraftBlogPostDto,
  UpdateBlogPostDto,
  QueryBlogTagsDto,
  BlogPostDetailDto,
  BlogCategoryDto,
  BlogTagCursorResponseDto,
  BlogPostListItemDto,
} from "@/interfaces/dtos/blog";
import { ApiResponse } from "@/interfaces/dtos";
import { CommentDto } from "@/interfaces/dtos/comment/req/comment.dto";
import { Comment } from "@/core/entities";

@ApiTags("Blogs")
@Controller("blogs")
export class BlogController {
  constructor(private readonly blogUseCase: BlogUseCases) {}

  @Get()
  @ApiOperation({
    summary: "Get Blogs List",
    description:
      "Retrieve a paginated list of published blogs with optional filtering and sorting.",
  })
  async getBlogs(
    @Query() query: QueryBlogsDto,
  ): Promise<ApiResponse<PaginatedResult<BlogPostListItemDto>>> {
    return this.blogUseCase.getBlogs(query);
  }

  @UseGuards(JwtAuthGuard)
  @Get("my")
  @ApiOperation({
    summary: "Get My Blogs",
    description:
      "Retrieve blogs created by the authenticated user, including draft posts",
  })
  async getMyBlogs(
    @GetUser() user: TokenPayload,
    @Query() query: QueryBlogsDto,
  ): Promise<ApiResponse<PaginatedResult<BlogPostListItemDto>>> {
    return this.blogUseCase.getMyBlogs(user.userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Get("saved")
  @ApiOperation({
    summary: "Get Saved Blogs",
    description:
      "Retrieve blogs saved by the authenticated user with cursor pagination",
  })
  async getSavedBlogs(
    @GetUser() user: TokenPayload,
    @Query() query: QueryBlogsDto,
  ): Promise<ApiResponse<PaginatedResult<BlogPostListItemDto>>> {
    return this.blogUseCase.getSavedBlogs(user.userId, query);
  }

  @Get("top")
  @ApiOperation({
    summary: "Get Top Blogs",
    description:
      "Retrieve trending/top blogs, typically sorted by likes or view count",
  })
  async getTopBlogs(): Promise<ApiResponse<BlogPostListItemDto[]>> {
    return this.blogUseCase.getTopBlogs();
  }

  @Get("categories")
  @ApiOperation({
    summary: "Get Blog Categories",
    description: "Retrieve all available blog categories",
  })
  async getCategories(): Promise<ApiResponse<BlogCategoryDto[]>> {
    return this.blogUseCase.getCategories();
  }

  @Get("tags")
  @ApiOperation({
    summary: "Get Tags",
    description:
      "Retrieve available blog tags with optional search and pagination",
  })
  async getTags(
    @Query() query: QueryBlogTagsDto,
  ): Promise<ApiResponse<BlogTagCursorResponseDto>> {
    return this.blogUseCase.getTags(query);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":postId/comments")
  @ApiOperation({
    summary: "Create Blog Comment",
    description: "Create a new comment or reply for a specific blog post",
  })
  async createComment(
    @GetUser() user: TokenPayload,
    @Param("postId") postId: string,
    @Body() dto: CommentDto,
    @Headers("accept-language") acceptLanguage?: string,
  ): Promise<ApiResponse<Comment>> {
    return this.blogUseCase.createComment(user, postId, dto, acceptLanguage);
  }

  @Get(":slug/related")
  @ApiOperation({
    summary: "Get Related Blog Posts",
    description:
      "Retrieve related blog posts for a given slug using Content-Based Similarity Scoring (same category +5, common tags +2 each, same source type +1)",
  })
  @ApiParam({ name: "slug", description: "URL-friendly slug of the blog post" })
  async getRelatedPosts(
    @Param("slug") slug: string,
  ): Promise<ApiResponse<BlogPostListItemDto[]>> {
    return this.blogUseCase.getRelatedPosts(slug, 4);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get(":slug")
  @ApiOperation({
    summary: "Get Blog by Slug",
    description:
      "Retrieve a single blog post by its slug, including all details, comments, and user interactions",
  })
  @ApiParam({ name: "slug", description: "URL-friendly slug of the blog post" })
  async getBlogBySlug(
    @Param("slug") slug: string,
    @GetUser() user?: TokenPayload,
  ): Promise<ApiResponse<BlogPostDetailDto>> {
    return this.blogUseCase.getBlogBySlug(slug, user?.userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({
    summary: "Create Blog",
    description:
      "Create a new blog post directly (submitted for review as PENDING). Does not require a draft.",
  })
  async createBlog(
    @GetUser() user: TokenPayload,
    @Body() dto: CreateBlogPostDto,
    @Headers("accept-language") acceptLanguage?: string,
  ): Promise<ApiResponse<{ slug: string }>> {
    return this.blogUseCase.createPost(user, dto, acceptLanguage);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":postId/submit")
  @ApiOperation({
    summary: "Submit Draft for Review",
    description:
      "Submit an existing draft blog post for review. Updates content and changes status from DRAFT to PENDING.",
  })
  @ApiParam({ name: "postId", description: "ID of the draft blog post" })
  async submitDraft(
    @GetUser() user: TokenPayload,
    @Param("postId") postId: string,
    @Body() dto: CreateBlogPostDto,
    @Headers("accept-language") acceptLanguage?: string,
  ): Promise<ApiResponse<{ slug: string }>> {
    return this.blogUseCase.submitDraft(user, postId, dto, acceptLanguage);
  }

  @UseGuards(JwtAuthGuard)
  @Post("draft")
  @ApiOperation({
    summary: "Save Draft",
    description:
      "Save a blog post as draft or update an existing draft. Without postId creates new draft, with postId updates existing draft.",
  })
  @ApiQuery({
    name: "postId",
    required: false,
    description: "ID of an existing draft to update",
  })
  async saveDraft(
    @GetUser() user: TokenPayload,
    @Body() dto: SaveDraftBlogPostDto,
    @Query("postId") postId?: string,
    @Headers("accept-language") acceptLanguage?: string,
  ): Promise<ApiResponse<{ id: string; slug: string }>> {
    return this.blogUseCase.saveDraft(user, dto, postId, acceptLanguage);
  }

  @UseGuards(JwtAuthGuard)
  @Put(":id")
  @ApiOperation({
    summary: "Update Blog",
    description: "Update an existing blog post (must be the post author)",
  })
  @ApiParam({ name: "id", description: "Blog post ID" })
  async updateBlog(
    @GetUser() user: TokenPayload,
    @Param("id") id: string,
    @Body() dto: UpdateBlogPostDto,
    @Headers("accept-language") acceptLanguage?: string,
  ): Promise<ApiResponse<UpdateBlogPostDto>> {
    return this.blogUseCase.updatePost(user, id, dto, acceptLanguage);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  @ApiOperation({
    summary: "Delete Blog",
    description: "Delete a blog post (must be the post author)",
  })
  @ApiParam({ name: "id", description: "Blog post ID" })
  async deleteBlog(
    @GetUser() user: TokenPayload,
    @Param("id") id: string,
  ): Promise<ApiResponse<void>> {
    return this.blogUseCase.deletePost(user, id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":blogId/likes")
  @ApiOperation({
    summary: "Toggle Like",
    description:
      "Like or unlike a blog post. Toggles the like state for the current user.",
  })
  @ApiParam({ name: "blogId", description: "Blog post ID" })
  async toggleLike(
    @GetUser() user: TokenPayload,
    @Param("blogId") blogId: string,
  ): Promise<ApiResponse<void>> {
    return this.blogUseCase.toggleLike(user, blogId);
  }

  @UseGuards(JwtAuthGuard)
  @Post(":blogId/saves")
  @ApiOperation({
    summary: "Toggle Save",
    description:
      "Save or unsave a blog post. Toggles the save state for the current user.",
  })
  @ApiParam({ name: "blogId", description: "Blog post ID" })
  async toggleSave(
    @GetUser() user: TokenPayload,
    @Param("blogId") blogId: string,
  ): Promise<ApiResponse<void>> {
    return this.blogUseCase.toggleSave(user, blogId);
  }
}
