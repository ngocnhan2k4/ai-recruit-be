import { Injectable, Logger, NotFoundException } from "@nestjs/common";
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

  async getProvinceById(id: string): Promise<ApiResponse<ProvinceDto>> {
    const province = await this.provinceRepository.get(id);

    if (!province) {
      throw new NotFoundException({
        message: `Province with ID ${id} not found`,
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    this.logger.log(`Fetched province with ID: ${id}`);
    return {
      message: "Province fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: province,
    };
  }
}
