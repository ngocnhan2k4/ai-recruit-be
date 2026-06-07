import { BlogUseCases } from "@/use-cases/blog/blog.use-case";
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger";
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from "@/frameworks/auth-services/guards";
import { GetUser } from "@/common/decorators";
import type { PaginatedResult, TokenPayload } from "@/common/types";
import {
  QueryBlogsDto,
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
  ): Promise<ApiResponse<Comment>> {
    return this.blogUseCase.createComment(user, postId, dto);
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
    return this.blogUseCase.getRelatedPosts(slug);
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
