import { Injectable, Logger } from "@nestjs/common";
import { IUniversityRepository } from "@/core";
import { ApiResponse, UniversityDto } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/response";

@Injectable()
export class UniversityUseCases {
  private readonly logger = new Logger(UniversityUseCases.name);
  constructor(private readonly universityRepository: IUniversityRepository) {}

  async getUniversities(): Promise<ApiResponse<UniversityDto[]>> {
    const data = await this.universityRepository.getAll();
    this.logger.log(`Fetched ${data.length} universities`);
    return {
      message: "Universities fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: data,
    };
  }
}
