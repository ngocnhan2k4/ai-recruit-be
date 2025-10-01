import { Injectable, Logger } from "@nestjs/common";
import { IDataServices } from "../../core/abstracts";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/response";
import { CategoryDto } from "@/interfaces/dtos/category.dto";

@Injectable()
export class CategoryUseCases {
  private readonly logger = new Logger(CategoryUseCases.name);
  constructor(private readonly dataServices: IDataServices) {}

  async getCategories(): Promise<ApiResponse<CategoryDto[]>> {
    const data = await this.dataServices.categories.getAll();
    this.logger.log(`Fetched ${data.length} categories`);
    return {
      message: "Categories fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data,
    };
  }
}
