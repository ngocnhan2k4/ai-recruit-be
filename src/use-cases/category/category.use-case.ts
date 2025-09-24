import { Injectable } from "@nestjs/common";
import { IDataServices } from "../../core/abstracts";
import { Category } from "@/core/entities/category.entity";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/constants";

@Injectable()
export class CategoryUseCases {
  constructor(private readonly dataServices: IDataServices) {}

  async getCategories(): Promise<ApiResponse<Category[]>> {
    const data = await this.dataServices.categories.getAll();
    return new ApiResponse<Category[]>({
      message: "Categories fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data,
    });
  }
}
