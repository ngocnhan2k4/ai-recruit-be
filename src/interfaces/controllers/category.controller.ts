import { CategoryUseCases } from "@/use-cases/category/category.use-case";
import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponseDto, ApiResponse } from "../dtos";
import { CategoryDto } from "../dtos/category.dto";

@ApiTags("Categories")
@Controller("categories")
export class CategoryController {
  constructor(private readonly categoryUseCases: CategoryUseCases) {}

  @ApiOperation({
    summary: "Get all categories",
  })
  @ApiResponseDto(CategoryDto, { isArray: true })
  @Get()
  async getCategories(): Promise<ApiResponse<CategoryDto[]>> {
    return this.categoryUseCases.getCategories();
  }
}
