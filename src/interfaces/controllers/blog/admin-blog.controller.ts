import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards/system-authorize.guard";
import { ApiResponse } from "@/interfaces/dtos";
import {
  CreateBlogCategoryDto,
  CreateBlogTagDto,
  GenerateAiBlogDto,
  QueryBlogCategoriesDto,
  QueryBlogsDto,
  QueryBlogTagsDto,
  UpdateBlogStatusRequest,
} from "@/interfaces/dtos/blog/req";
import { BlogPostDetailDto } from "@/interfaces/dtos/blog/res/blog-post.dto";
import { BlogUseCases } from "@/use-cases/blog/blog.use-case";
import {
  Body,
  Controller,
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
    summary: "Generate weekly AI job-market blog",
    description:
      "Manually trigger AI blog generation for backfill. Pass `date` (YYYY-MM-DD) as the inclusive end of the job window; omit to use today. Skips if slug for that date already exists.",
  })
  @Post("generate-ai")
  async generateAiBlog(@Body() body: GenerateAiBlogDto) {
    return await this.blogUseCases.generateWeeklyAiBlog(body);
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
}
