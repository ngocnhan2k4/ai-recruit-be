import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  ISkillRepository,
  ISkillsSynonymsRepository,
  Skill,
  IMessageQueueService,
  JobEventType,
} from "@/core";
import {
  ApiResponse,
  BulkReviewSkillDto,
  DeleteSkillsDto,
  CrawledSkillDto,
  GetCrawledSkillsQueryDto,
  GetSkillsQueryDto,
  GetTopDemandedSkillsQueryDto,
  PaginatedResultDto,
  SkillDto,
  TopDemandedSkillItemDto,
  CreateSkillDto,
  UpdateSkillNameDto,
} from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants";

@Injectable()
export class SkillUseCases {
  private readonly logger = new Logger(SkillUseCases.name);
  constructor(
    private readonly skillRepository: ISkillRepository,
    private readonly skillsSynonymsRepository: ISkillsSynonymsRepository,
    private readonly messageQueueService: IMessageQueueService,
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
    const fields = Array.from(new Set([...(query.fields ?? []), "createdAt"]));
    const data = await this.skillRepository.getPaginatedSkills({
      ...query,
      fields,
      isApproved: false,
      sortBy: query.sortBy ?? "createdAt",
      sortDirection: query.sortDirection ?? "desc",
    });

    const skillNames = data.data.map((s) => s.name);
    const { matches } =
      await this.skillsSynonymsRepository.getSynonymsSkills(skillNames);

    const enriched: CrawledSkillDto[] = data.data.map((s) => ({
      ...s,
      synonym: matches[s.name]?.resolvedName ?? null,
    }));

    return {
      message: "Crawled skills fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: { ...data, data: enriched },
    };
  }

  async bulkReviewSkills(dto: BulkReviewSkillDto): Promise<ApiResponse<void>> {
    // Collect job IDs before reviewing/deleting skills
    const jobIds = await this.skillRepository.getJobIdsBySkillIds(dto.ids);

    await this.skillRepository.bulkReviewSkills(dto.ids, dto.status);

    this.logger.log(
      `Bulk reviewed skills with IDs: ${dto.ids.join(", ")} and status: ${dto.status}`,
    );

    if (jobIds.length > 0) {
      await this.reindexJobs(jobIds);
    }

    return {
      message: "Skills reviewed successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async deleteSkill(dto: DeleteSkillsDto): Promise<ApiResponse<void>> {
    const skillIds = Array.isArray(dto.skillIds)
      ? dto.skillIds
      : [dto.skillIds];

    // Collect job IDs before deleting references
    const jobIds = await this.skillRepository.getJobIdsBySkillIds(skillIds);

    await this.skillRepository.deleteSkillAndReferences(skillIds);

    if (jobIds.length > 0) {
      await this.reindexJobs(jobIds);
    }

    return {
      message: "Skills deleted successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async updateSkillName(
    id: string,
    dto: UpdateSkillNameDto,
  ): Promise<ApiResponse<void>> {
    const skill = await this.skillRepository.get(id);
    if (!skill) {
      throw new NotFoundException(`Skill with ID ${id} not found`);
    }

    const nextName = dto.name.trim();

    // Collect job IDs before name update
    const jobIds = await this.skillRepository.getJobIdsBySkillIds([id]);

    await this.skillRepository.update(
      { id },
      {
        name: nextName,
      },
    );

    if (jobIds.length > 0) {
      await this.reindexJobs(jobIds);
    }

    return {
      message: "Skill name updated successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async getTopDemandedSkills(
    query: GetTopDemandedSkillsQueryDto,
  ): Promise<ApiResponse<TopDemandedSkillItemDto[]>> {
    const limit = query.limit ?? 10;
    const { fromDate, toDate, provinceId, categoryId } = query;

    const data = await this.skillRepository.getTopDemandedSkills(
      limit,
      fromDate,
      toDate,
      provinceId,
      categoryId,
    );
    this.logger.log(`Fetched top ${limit} demanded skills`);

    return {
      message: "Top demanded skills fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data,
    };
  }

  private async reindexJobs(jobIds: string[]): Promise<void> {
    try {
      this.logger.log(`Triggering reindex for ${jobIds.length} jobs`);
      for (const jobId of jobIds) {
        await this.messageQueueService
          .addJob(
            JobEventType.UPSERT_JOB,
            { jobId },
            { jobId: `job-sync-${jobId}` },
          )
          .catch((error) => {
            this.logger.error(
              `Error syncing job ${jobId} to message queue during skill change: ${error}`,
            );
          });
      }
    } catch (e: any) {
      this.logger.error(`Failed to trigger job reindexing: ${e.message}`);
    }
  }
}
