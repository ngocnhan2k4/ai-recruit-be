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
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GetUser } from "@/common/decorators";
import type { TokenPayload } from "@/common/types";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { ApiResponse, ApiResponseDto } from "@/interfaces/dtos";
import {
  CreateBlogCommentDto,
  CreateBlogPostDto,
  QueryBlogsDto,
  UpdateBlogPostDto,
} from "@/interfaces/dtos/blog/req/blog-post.req.dto";
import {
  BlogCommentDto,
  BlogLikeResponseDto,
  BlogPostDetailDto,
  BlogPostListResponseDto,
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

  @ApiOperation({ summary: "Get blog post by slug" })
  @ApiResponseDto(BlogPostDetailDto)
  @Get(":slug")
  async getBlogBySlug(
    @Param("slug") slug: string,
  ): Promise<ApiResponse<BlogPostDetailDto>> {
    return this.blogUseCases.getBlogBySlug(slug);
  }

  @ApiOperation({ summary: "Create blog post" })
  @ApiResponseDto(BlogPostDetailDto)
  @UseGuards(JwtAuthGuard)
  @Post()
  async createPost(
    @GetUser() user: TokenPayload,
    @Body() dto: CreateBlogPostDto,
  ): Promise<ApiResponse<BlogPostDetailDto>> {
    return this.blogUseCases.createPost(user, dto);
  }

  @ApiOperation({ summary: "Update blog post" })
  @ApiResponseDto(BlogPostDetailDto)
  @UseGuards(JwtAuthGuard)
  @Put(":slug")
  async updatePost(
    @GetUser() user: TokenPayload,
    @Param("slug") slug: string,
    @Body() dto: UpdateBlogPostDto,
  ): Promise<ApiResponse<BlogPostDetailDto>> {
    return this.blogUseCases.updatePost(user, slug, dto);
  }

  @ApiOperation({ summary: "Delete blog post" })
  @UseGuards(JwtAuthGuard)
  @Delete(":slug")
  async deletePost(
    @GetUser() user: TokenPayload,
    @Param("slug") slug: string,
  ): Promise<ApiResponse<null>> {
    return this.blogUseCases.deletePost(user, slug);
  }

  @ApiOperation({ summary: "Add comment to blog post" })
  @ApiResponseDto(BlogCommentDto)
  @UseGuards(JwtAuthGuard)
  @Post(":slug/comments")
  async createComment(
    @GetUser() user: TokenPayload,
    @Param("slug") slug: string,
    @Body() dto: CreateBlogCommentDto,
  ): Promise<ApiResponse<BlogCommentDto>> {
    return this.blogUseCases.createComment(user, slug, dto);
  }

  @ApiOperation({ summary: "Delete comment" })
  @UseGuards(JwtAuthGuard)
  @Delete(":slug/comments/:commentId")
  async deleteComment(
    @GetUser() user: TokenPayload,
    @Param("slug") slug: string,
    @Param("commentId") commentId: string,
  ): Promise<ApiResponse<null>> {
    return this.blogUseCases.deleteComment(user, slug, commentId);
  }

  @ApiOperation({ summary: "Like/unlike blog post" })
  @ApiResponseDto(BlogLikeResponseDto)
  @UseGuards(JwtAuthGuard)
  @Post(":slug/likes")
  async toggleLike(
    @GetUser() user: TokenPayload,
    @Param("slug") slug: string,
  ): Promise<ApiResponse<BlogLikeResponseDto>> {
    return this.blogUseCases.toggleLike(user, slug);
  }
}
