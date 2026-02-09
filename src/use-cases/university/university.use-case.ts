import { Injectable, Logger } from "@nestjs/common";
import { IOrganizationRepository } from "@/core";
import { ApiResponse, OrganizationDto } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants";
import { OrganizationTypeEnum } from "@/core/entities/enum.entity";

@Injectable()
export class UniversityUseCases {
  private readonly logger = new Logger(UniversityUseCases.name);
  constructor(
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async getUniversities(): Promise<ApiResponse<Partial<OrganizationDto>[]>> {
    const universities = await this.organizationRepository.getByField({
      type: OrganizationTypeEnum.UNIVERSITY,
    });
    this.logger.log(`Fetched ${universities.length} universities`);

    const data: Partial<OrganizationDto>[] = universities.map((university) => ({
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
