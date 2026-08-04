import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { normalizeString } from "@/common/utils";
import {
  ISkillRepository,
  ISkillService,
  ISkillsSynonymsRepository,
  IMessageQueueService,
  JobEventType,
} from "@/core";
import { ApiResponse, PaginatedResultDto } from "@/interfaces/dtos";
import {
  GetSkillsSynonymsQueryDto,
  MergeSkillsDto,
  UpdateSkillSynonymDto,
} from "@/interfaces/dtos/skill-synonym/req/skill-synonym.dto";
import { SkillSynonymResponseDto } from "@/interfaces/dtos/skill-synonym/res/skill-synonym.dto";
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  Logger,
} from "@nestjs/common";

@Injectable()
export class SkillSynonymUseCases {
  private readonly logger = new Logger(SkillSynonymUseCases.name);
  constructor(
    private readonly skillsSynonymsRepository: ISkillsSynonymsRepository,
    private readonly skillRepository: ISkillRepository,
    private readonly skillService: ISkillService,
    private readonly messageQueueService: IMessageQueueService,
  ) {}

  private normalizeAliases(aliasNames: string[]): string[] {
    return Array.from(
      new Set(
        aliasNames.map(normalizeString).filter((name) => name.length > 0),
      ),
    );
  }

  async getSkillsSynonyms(
    query: GetSkillsSynonymsQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<SkillSynonymResponseDto>>> {
    const result = await this.skillService.getSkillsSynonyms(query);

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    };
  }

  async updateSkillSynonym(
    skillId: string,
    dto: UpdateSkillSynonymDto,
  ): Promise<ApiResponse<SkillSynonymResponseDto>> {
    if (!skillId) {
      throw new BadRequestException({
        message: "skillId is required",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    const currentSkill = await this.skillRepository.get(skillId);
    if (!currentSkill) {
      throw new NotFoundException({
        message: "Skill not found",
        code: RESPONSE_CODE.SKILL_NOT_FOUND,
      });
    }

    const aliasNames = this.normalizeAliases(dto.aliasNames || []);

    const allRows = await this.skillsSynonymsRepository.getAll([
      "aliasName",
      "masterSkillId",
    ]);

    const conflicts = aliasNames.filter((alias) =>
      allRows.some(
        (row) =>
          normalizeString(row.aliasName) === alias &&
          row.masterSkillId !== skillId,
      ),
    );

    if (conflicts.length > 0) {
      throw new BadRequestException({
        message: `Alias names [${conflicts.join(", ")}] already exist`,
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    await this.skillsSynonymsRepository.executeWithTransaction(async (tx) => {
      await this.skillsSynonymsRepository.deletePermanently(
        { masterSkillId: skillId },
        tx,
      );

      if (aliasNames.length > 0) {
        await this.skillsSynonymsRepository.createMany(
          aliasNames.map((aliasName) => ({
            masterSkillId: skillId,
            aliasName,
          })),
          tx,
        );
      }
    });

    const latestRows = await this.skillsSynonymsRepository.getByField({
      masterSkillId: skillId,
    });

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        id: currentSkill.id,
        masterName: currentSkill.name,
        aliasNames: latestRows
          .map((row) => row.aliasName)
          .sort((a, b) => a.localeCompare(b)),
      },
    };
  }

  async mergeSkills(
    targetSkillId: string,
    dto: MergeSkillsDto,
  ): Promise<ApiResponse<void>> {
    const targetSkill = await this.skillRepository.get(targetSkillId);
    if (!targetSkill) {
      throw new NotFoundException({
        message: "Target skill not found",
        code: RESPONSE_CODE.SKILL_NOT_FOUND,
      });
    }

    const sourceSkillIds = Array.from(
      new Set(dto.sourceSkillIds.filter((id) => id !== targetSkillId)),
    );

    if (sourceSkillIds.length === 0) {
      throw new BadRequestException({
        message:
          "sourceSkillIds must include at least one id different from target skill id",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    const sourceSkills = await this.skillRepository.getByIds(sourceSkillIds, [
      "id",
      "name",
    ]);

    if (sourceSkills.length !== sourceSkillIds.length) {
      const found = new Set(sourceSkills.map((s) => s.id));
      const missing = sourceSkillIds.filter((id) => !found.has(id));
      throw new NotFoundException({
        message: `Source skills not found: ${missing.join(", ")}`,
        code: RESPONSE_CODE.SKILL_NOT_FOUND,
      });
    }

    // Collect affected job IDs before merging skills
    const affectedJobIds = await this.skillRepository.getJobIdsBySkillIds([
      targetSkillId,
      ...sourceSkillIds,
    ]);

    await this.skillRepository.mergeSkillsAndReferences(
      targetSkillId,
      sourceSkillIds,
    );

    if (affectedJobIds.length > 0) {
      await this.reindexJobs(affectedJobIds);
    }

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
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
              `Error syncing job ${jobId} to message queue during skill merge: ${error}`,
            );
          });
      }
    } catch (e: any) {
      this.logger.error(`Failed to trigger job reindexing: ${e.message}`);
    }
  }
}
