import { Injectable } from "@nestjs/common";
import { IDataServices } from "../../core/abstracts";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/constants";

@Injectable()
export class CategoryUseCases {
  constructor(private readonly dataServices: IDataServices) {}

  async getCategories(): Promise<ApiResponse<string[]>> {
    const data = await this.dataServices.categories.getAll();
    return new ApiResponse<string[]>({
      message: "Categories fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: data.map((category) => category.name),
    });
  }
}
