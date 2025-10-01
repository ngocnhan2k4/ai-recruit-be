import { Injectable } from "@nestjs/common";
import { IDataServices } from "../../core/abstracts";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/response";
import { ProvinceDto } from "@/interfaces/dtos/province.dto";

@Injectable()
export class ProvinceUseCases {
  constructor(private readonly dataServices: IDataServices) {}

  async getProvinces(): Promise<ApiResponse<ProvinceDto[]>> {
    const data = await this.dataServices.provinces.getAll();
    return {
      message: "Provinces fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data,
    };
  }
}
