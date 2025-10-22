import { Injectable, Logger } from "@nestjs/common";
import { IUniversityRepository } from "@/core";
import { ApiResponse, UniversityDto } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/response";

@Injectable()
export class UniversityUseCases {
  private readonly logger = new Logger(UniversityUseCases.name);
  constructor(private readonly universityRepository: IUniversityRepository) {}

  async getUniversities(): Promise<ApiResponse<UniversityDto[]>> {
    const universities = await this.universityRepository.getAll();
    this.logger.log(`Fetched ${universities.length} universities`);

    const data: UniversityDto[] = universities.map((university) => ({
      id: university.id,
      name: university.name,
    }));

    return {
      message: "Universities fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: data,
    };
  }
}
