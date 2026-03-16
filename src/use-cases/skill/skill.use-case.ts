import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ISkillRepository, Skill } from "@/core";
import {
  ApiResponse,
  GetSkillsQueryDto,
  PaginatedResultDto,
  SkillDto,
} from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants";
import { CreateSkillDto } from "@/interfaces/dtos";

@Injectable()
export class SkillUseCases {
  private readonly logger = new Logger(SkillUseCases.name);
  constructor(private readonly skillRepository: ISkillRepository) {}

  async createMany(
    createSkillDto: CreateSkillDto,
  ): Promise<ApiResponse<SkillDto[]>> {
    const data = await this.skillRepository.createMany(
      createSkillDto.name.map((name: string) => ({ name })),
    );
    this.logger.log(`Created ${data.length} skills`);
    return {
      message: "Skills created successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: data.map((skill: Skill) => ({ id: skill.id, name: skill.name })),
    };
  }

  async getSkills(): Promise<ApiResponse<SkillDto[]>> {
    const { data } = await this.skillRepository.getPaginatedSkills({
      limit: 10_000,
      page: 1,
    });
    return {
      message: "Skills fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: data.map((skill: Skill) => ({ id: skill.id, name: skill.name })),
    };
  }

  async getPaginatedSkills(
    query: GetSkillsQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<SkillDto>>> {
    const data = await this.skillRepository.getPaginatedSkills(query);
    this.logger.log(`Fetched paginated skills`);
    return {
      message: "Paginated skills fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: data,
    };
  }

  async getSkillById(id: string): Promise<ApiResponse<SkillDto>> {
    const skill = await this.skillRepository.getSkillById(id);
    if (!skill) {
      throw new NotFoundException(`Skill with ID ${id} not found`);
    }

    return {
      message: "Skill fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: skill,
    };
  }
}
