import { CategoryUseCases } from "@/use-cases/category/category.use-case";
import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponseDto, ApiResponse } from "../dtos";
import { CategoryDto } from "../dtos/category.dto";
import { GuestGuard } from "@/frameworks/auth-services/guards/guest.guard";

@ApiTags("Categories")
@Controller("categories")
export class CategoryController {
  constructor(private readonly categoryUseCases: CategoryUseCases) {}

  @ApiOperation({
    summary: "Get all categories",
  })
  @ApiResponseDto(CategoryDto, { isArray: true })
  @UseGuards(GuestGuard)
  @Get()
  async getCategories(): Promise<ApiResponse<CategoryDto[]>> {
    return this.categoryUseCases.getCategories();
  }
}
