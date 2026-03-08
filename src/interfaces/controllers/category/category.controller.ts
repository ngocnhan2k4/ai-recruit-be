import { CategoryUseCases } from "@/use-cases/category/category.use-case";
import { Controller, Get, UseInterceptors } from "@nestjs/common";
import { CacheInterceptor, CacheTTL } from "@nestjs/cache-manager";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { LLONG_TTL } from "@/common/constants";
import { ApiResponseDto, ApiResponse } from "../../dtos";
import { CategoryDto } from "../../dtos/category";

@ApiTags("Categories")
@Controller("categories")
export class CategoryController {
  constructor(private readonly categoryUseCases: CategoryUseCases) {}

  @ApiOperation({
    summary: "Get all categories",
  })
  @ApiResponseDto(CategoryDto, { isArray: true })
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(LLONG_TTL)
  @Get()
  async getCategories(): Promise<ApiResponse<CategoryDto[]>> {
    return this.categoryUseCases.getCategories();
  }
}
