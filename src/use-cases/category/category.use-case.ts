import { Injectable } from "@nestjs/common";
import { IDataServices } from "../../core/abstracts";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/response";

@Injectable()
export class CategoryUseCases {
  constructor(private readonly dataServices: IDataServices) {}

  async getCategories(): Promise<ApiResponse<string[]>> {
    const data = await this.dataServices.categories.getAll();
    return {
      message: "Categories fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: data.map((category) => category.name),
    };
  }
}
