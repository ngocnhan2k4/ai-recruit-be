import { CategoryUseCases } from "@/use-cases/category/category.use-case";
import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponseDto, ApiResponse } from "../dtos";

@ApiTags("Categories")
@Controller("categories")
export class CategoryController {
  constructor(private readonly categoryUseCases: CategoryUseCases) {}

  @ApiOperation({
    summary: "Get all categories",
  })
  @ApiResponseDto("string", { isArray: true })
  @Get()
  async getCategories(): Promise<ApiResponse<string[]>> {
    return this.categoryUseCases.getCategories();
  }
}
