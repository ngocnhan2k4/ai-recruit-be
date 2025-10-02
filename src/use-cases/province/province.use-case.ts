import { Injectable, Logger } from "@nestjs/common";
import { IProvinceRepository } from "../../core/abstracts";
import { ApiResponse, ProvinceDto } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/response";

@Injectable()
export class ProvinceUseCases {
  private readonly logger = new Logger(ProvinceUseCases.name);
  constructor(private readonly provinceRepository: IProvinceRepository) {}

  async getProvinces(): Promise<ApiResponse<ProvinceDto[]>> {
    const data = await this.provinceRepository.getAll();
    this.logger.log(`Fetched ${data.length} provinces`);
    return {
      message: "Provinces fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: data,
    };
  }
}
