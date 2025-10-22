import { Injectable, Logger } from "@nestjs/common";
import { ISkillRepository } from "@/core";
import { ApiResponse, SkillDto } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/response";

@Injectable()
export class SkillUseCases {
  private readonly logger = new Logger(SkillUseCases.name);
  constructor(private readonly skillRepository: ISkillRepository) {}

  async getSkills(): Promise<ApiResponse<SkillDto[]>> {
    const data = await this.skillRepository.getAll();
    this.logger.log(`Fetched ${data.length} skills`);
    return {
      message: "Skills fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: data,
    };
  }

  async createMany(createSkillDto): Promise<ApiResponse<SkillDto[]>> {
    const data = await this.skillRepository.createMany(createSkillDto);
    this.logger.log(`Created ${data.length} skills`);
    return {
      message: "Skills created successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: data,
    };
  }
}
