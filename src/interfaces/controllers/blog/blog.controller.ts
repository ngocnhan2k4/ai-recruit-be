import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GetUser } from "@/common/decorators";
import type { TokenPayload } from "@/common/types";
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
  SystemAuthorizeGuard,
} from "@/frameworks/auth-services/guards";
import { ApiResponse, ApiResponseDto } from "@/interfaces/dtos";
import {
  QueryBlogTagsDto,
  CreateBlogCommentDto,
  CreateBlogPostDto,
  QueryBlogsDto,
  UpdateBlogPostDto,
  SaveDraftBlogPostDto,
} from "@/interfaces/dtos/blog/req/blog-post.dto";
import {
  BlogCategoryDto,
  BlogCommentDto,
  BlogLikeResponseDto,
  BlogPostDetailDto,
  BlogPostListResponseDto,
  BlogTagCursorResponseDto,
} from "@/interfaces/dtos/blog/res/blog-response.dto";
import { BlogUseCases } from "@/use-cases/blog/blog.use-case";

@ApiTags("Blogs")
@ApiBearerAuth()
@Controller("blogs")
export class BlogController {
  constructor(private readonly blogUseCases: BlogUseCases) {}

  @ApiOperation({ summary: "List blog posts" })
  @ApiResponseDto(BlogPostListResponseDto)
  @Get()
  async getBlogs(
    @Query() query: QueryBlogsDto,
  ): Promise<ApiResponse<BlogPostListResponseDto>> {
    return this.blogUseCases.getBlogs(query);
  }

  @ApiOperation({ summary: "Get top blog" })
  @ApiResponseDto(BlogPostListResponseDto)
  @Get("top")
  async getTopBlogs(): Promise<ApiResponse<BlogPostListResponseDto>> {
    return this.blogUseCases.getTopBlogs();
  }

  @ApiOperation({ summary: "Get blog categories" })
  @ApiResponseDto(BlogCategoryDto, { isArray: true })
  @Get("categories")
  async getCategories(): Promise<ApiResponse<BlogCategoryDto[]>> {
    return this.blogUseCases.getCategories();
  }

  @ApiOperation({ summary: "Get tags for blog (skills + tags)" })
  @ApiResponseDto(BlogTagCursorResponseDto)
  @Get("tags")
  async getTags(
    @Query() query: QueryBlogTagsDto,
  ): Promise<ApiResponse<BlogTagCursorResponseDto>> {
    return this.blogUseCases.getTags(query);
  }

  @ApiOperation({ summary: "Get my blog posts" })
  @ApiResponseDto(BlogPostListResponseDto)
  @UseGuards(JwtAuthGuard)
  @Get("my")
  async getMyBlogs(
    @GetUser() user: TokenPayload,
    @Query() query: QueryBlogsDto,
  ): Promise<ApiResponse<BlogPostListResponseDto>> {
    return this.blogUseCases.getMyBlogs(user, query);
  }

  @ApiOperation({ summary: "Get blog post by slug" })
  @ApiResponseDto(BlogPostDetailDto)
  @UseGuards(OptionalJwtAuthGuard)
  @Get(":slug")
  async getBlogBySlug(
    @Param("slug") slug: string,
    @GetUser() user?: TokenPayload,
  ): Promise<ApiResponse<BlogPostDetailDto>> {
    return this.blogUseCases.getBlogBySlug(slug, user?.userId);
  }

  @ApiOperation({ summary: "Create blog post" })
  @ApiResponseDto(BlogPostDetailDto)
  @UseGuards(JwtAuthGuard)
  @Post()
  async createPost(
    @GetUser() user: TokenPayload,
    @Body() dto: CreateBlogPostDto,
  ): Promise<ApiResponse<{ slug: string }>> {
    return this.blogUseCases.createPost(user, dto);
  }

  @ApiOperation({ summary: "Update blog post" })
  @ApiResponseDto(BlogPostDetailDto)
  @UseGuards(JwtAuthGuard)
  @Put(":id")
  async updatePost(
    @GetUser() user: TokenPayload,
    @Param("id") id: string,
    @Body() dto: UpdateBlogPostDto,
  ): Promise<ApiResponse<UpdateBlogPostDto>> {
    return this.blogUseCases.updatePost(user, id, dto);
  }

  @ApiOperation({ summary: "Save blog post as draft" })
  @UseGuards(JwtAuthGuard)
  @Post("draft")
  async saveDraft(
    @GetUser() user: TokenPayload,
    @Body() dto: SaveDraftBlogPostDto,
    @Query("postId") postId?: string,
  ): Promise<ApiResponse<{ id: string; slug: string }>> {
    return this.blogUseCases.saveDraft(user, dto, postId);
  }

  @ApiOperation({ summary: "Delete blog post" })
  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  async deletePost(
    @GetUser() user: TokenPayload,
    @Param("id") id: string,
  ): Promise<ApiResponse<void>> {
    return this.blogUseCases.deletePost(user, id);
  }

  @ApiOperation({ summary: "Add comment to blog post" })
  @ApiResponseDto(BlogCommentDto)
  @UseGuards(JwtAuthGuard)
  @Post(":id/comments")
  async createComment(
    @GetUser() user: TokenPayload,
    @Param("id") id: string,
    @Body() dto: CreateBlogCommentDto,
  ): Promise<ApiResponse<CreateBlogCommentDto>> {
    return this.blogUseCases.createComment(user, id, dto);
  }

  @ApiOperation({ summary: "Delete comment" })
  @UseGuards(JwtAuthGuard)
  @Delete(":id/comments/:commentId")
  async deleteComment(
    @GetUser() user: TokenPayload,
    @Param("id") id: string,
    @Param("commentId") commentId: string,
  ): Promise<ApiResponse<void>> {
    return this.blogUseCases.deleteComment(user, id, commentId);
  }

  @ApiOperation({ summary: "Like/unlike blog post" })
  @ApiResponseDto(BlogLikeResponseDto)
  @UseGuards(JwtAuthGuard)
  @Post(":id/likes")
  async toggleLike(
    @GetUser() user: TokenPayload,
    @Param("id") id: string,
  ): Promise<ApiResponse<void>> {
    return this.blogUseCases.toggleLike(user, id);
  }

  @ApiOperation({ summary: "Approve blog post" })
  @UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
  @Patch(":id/approve")
  async approvePost(
    @Param("id") id: string,
  ): Promise<ApiResponse<{ id: string }>> {
    return this.blogUseCases.approvePost(id);
  }

  @ApiOperation({ summary: "Reject blog post" })
  @UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
  @Patch(":id/reject")
  async rejectPost(
    @Param("id") id: string,
  ): Promise<ApiResponse<{ id: string }>> {
    return this.blogUseCases.rejectPost(id);
  }
}
