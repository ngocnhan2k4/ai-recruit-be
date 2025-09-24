import { Category } from "@/core";
import { CategoryUseCases } from "@/use-cases/category/category.use-case";
import { Controller, Get } from "@nestjs/common";
import {
  ApiOperation,
  ApiTags,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import { ApiResponse } from "../dtos";

@ApiTags("Categories")
@Controller("categories")
export class CategoryController {
  constructor(private readonly categoryUseCases: CategoryUseCases) {}

  @ApiOperation({
    summary: "Get all categories",
  })
  @SwaggerApiResponse({ type: ApiResponse<Category[]> })
  @Get()
  async getCategories(): Promise<ApiResponse<Category[]>> {
    return this.categoryUseCases.getCategories();
  }
}
