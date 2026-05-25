import {
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards/system-authorize.guard";
import { BlogUseCases } from "@/use-cases/blog/blog.use-case";
import {
  QueryBlogsDto,
  UpdateBlogStatusRequest,
  CreateBlogCategoryDto,
  CreateBlogTagDto,
  QueryBlogCategoriesDto,
  QueryBlogTagsDto,
} from "@/interfaces/dtos/blog/req";
import { BlogPostDetailDto } from "@/interfaces/dtos/blog/res/blog-post.dto";
import { ApiResponse } from "@/interfaces/dtos";
import {
  Controller,
  Get,
  Param,
  Put,
  Query,
  UseGuards,
  Body,
  Post,
} from "@nestjs/common";

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
  async getAdminBlogById(
    @Param("id") id: string,
  ): Promise<ApiResponse<BlogPostDetailDto>> {
    return this.blogUseCases.getAdminBlogById(id);
  }

  @ApiOperation({
    summary: "Update blog status",
    description:
      "Changes a blog post status to PUBLISHED (approved) or REJECTED. Cannot be used on DRAFT.",
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
