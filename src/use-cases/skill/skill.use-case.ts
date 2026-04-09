import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ISkillRepository, ISkillsSynonymsRepository, Skill } from "@/core";
import {
  ApiResponse,
  BulkReviewSkillDto,
  CrawledSkillDto,
  GetCrawledSkillsQueryDto,
  GetDemandedSkillsQueryDto,
  GetSkillsQueryDto,
  GetTopDemandedSkillsQueryDto,
  PaginatedResultDto,
  SkillDto,
  DemandedSkillItemDto,
  TopDemandedSkillItemDto,
  CreateSkillDto,
} from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants";

@Injectable()
export class SkillUseCases {
  private readonly logger = new Logger(SkillUseCases.name);
  constructor(
    private readonly skillRepository: ISkillRepository,
    private readonly skillsSynonymsRepository: ISkillsSynonymsRepository,
  ) {}

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

  async getCrawledSkills(
    query: GetCrawledSkillsQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<CrawledSkillDto>>> {
    const data = await this.skillRepository.getCrawledSkills(query);

    const skillNames = data.data.map((s) => s.name);
    const { matches } =
      await this.skillsSynonymsRepository.getSynonymsSkills(skillNames);

    const enriched = data.data.map((s) => ({
      ...s,
      synonym: matches[s.name]?.resolvedName ?? null,
    }));

    this.logger.log(`Fetched crawled skills`);

    return {
      message: "Crawled skills fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: { ...data, data: enriched },
    };
  }

  async bulkReviewSkills(dto: BulkReviewSkillDto): Promise<ApiResponse<void>> {
    await this.skillRepository.bulkReviewSkills(dto.ids, dto.status);

    this.logger.log(
      `Bulk reviewed skills with IDs: ${dto.ids.join(", ")} and status: ${dto.status}`,
    );

    return {
      message: "Skills reviewed successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async deleteSkill(id: string): Promise<ApiResponse<void>> {
    await this.skillRepository.deleteSkillAndReferences(id);
    return {
      message: "Skill deleted successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async getTopDemandedSkills(
    query: GetTopDemandedSkillsQueryDto,
  ): Promise<ApiResponse<TopDemandedSkillItemDto[]>> {
    const months = query.months ?? 3;
    const limit = query.limit ?? 10;

    const data = await this.skillRepository.getTopDemandedSkills(months, limit);
    this.logger.log(
      `Fetched top ${limit} demanded skills in last ${months} months`,
    );

    return {
      message: "Top demanded skills fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data,
    };
  }

  async getDemandedSkills(
    query: GetDemandedSkillsQueryDto,
  ): Promise<ApiResponse<DemandedSkillItemDto[]>> {
    const months = query.months ?? 0;
    const data = await this.skillRepository.getDemandedSkills(months);
    this.logger.log(
      `Fetched demanded skills (skills appearing in job postings) in last ${months} months`,
    );

    return {
      message: "Demanded skills fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data,
    };
  }
}
