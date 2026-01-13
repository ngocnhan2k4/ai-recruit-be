import { Injectable, Logger } from "@nestjs/common";
import { ICategoryRepository } from "@/core";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/response";
import { CategoryDto } from "@/interfaces/dtos";

@Injectable()
export class CategoryUseCases {
  private readonly logger = new Logger(CategoryUseCases.name);
  constructor(private readonly categoryRepository: ICategoryRepository) {}

  async getCategories(): Promise<ApiResponse<CategoryDto[]>> {
    const data = await this.categoryRepository.getAll(["id", "name"]);
    this.logger.log(`Fetched ${data.length} categories`);
    return {
      message: "Categories fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: data,
    };
  }
}
