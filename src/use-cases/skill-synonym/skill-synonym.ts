import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { NormalizeString } from "@/common/utils";
import {
  ISkillRepository,
  ISkillsSynonymsRepository,
  Skill,
  SkillSynonym,
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
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";

@Injectable()
export class SkillSynonymUseCases {
  private readonly logger = new Logger(SkillSynonymUseCases.name);
  constructor(
    @Inject(ISkillsSynonymsRepository)
    private readonly skillsSynonymsRepository: ISkillsSynonymsRepository,
    @Inject(ISkillRepository)
    private readonly skillRepository: ISkillRepository,
  ) {}

  private normalizeAliases(aliasNames: string[]): string[] {
    return Array.from(
      new Set(
        aliasNames
          .map((name) => NormalizeString(name))
          .filter((name) => name.length > 0),
      ),
    );
  }

  private buildGroupedResponse(
    skills: Pick<Skill, "id" | "name">[],
    rows: Pick<SkillSynonym, "masterName" | "aliasName">[],
  ): SkillSynonymResponseDto[] {
    const aliasMap = new Map<string, Set<string>>();

    for (const row of rows) {
      const normalizedMaster = NormalizeString(row.masterName);
      if (!aliasMap.has(normalizedMaster)) {
        aliasMap.set(normalizedMaster, new Set());
      }
      aliasMap.get(normalizedMaster)!.add(row.aliasName);
    }

    return skills
      .map((skill) => {
        const normalizedSkillName = NormalizeString(skill.name);
        const aliases = aliasMap.get(normalizedSkillName);

        return {
          id: skill.id,
          masterName: skill.name,
          aliasNames: Array.from(aliases?.values() ?? []).sort((a, b) =>
            a.localeCompare(b),
          ),
        };
      })
      .sort((a, b) => a.masterName.localeCompare(b.masterName));
  }

  async getSkillsSynonyms(
    query?: GetSkillsSynonymsQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<SkillSynonymResponseDto>>> {
    const page = Math.max(query?.page ?? 1, 1);
    const limit = Math.max(query?.limit ?? 10, 1);
    const keyword = query?.keyword?.trim().toLowerCase();
    const hasSynonyms = query?.hasSynonyms;

    const [allSkills, allRows] = await Promise.all([
      this.skillRepository.getAll(["id", "name"]),
      this.skillsSynonymsRepository.getAll(["masterName", "aliasName"]),
    ]);

    const grouped = this.buildGroupedResponse(allSkills, allRows);

    const filtered = grouped.filter((item) => {
      const matchesKeyword = keyword
        ? NormalizeString(item.masterName).includes(keyword) ||
          item.aliasNames.some((alias) =>
            NormalizeString(alias).includes(keyword),
          )
        : true;

      const hasAlias = item.aliasNames.length > 0;
      const matchesSynonymFilter =
        hasSynonyms === undefined ? true : hasSynonyms === hasAlias;

      return matchesKeyword && matchesSynonymFilter;
    });

    const total = filtered.length;
    const offset = (page - 1) * limit;
    const data = filtered.slice(offset, offset + limit);
    const hasNextPage = offset + limit < total;

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        data,
        pagination: {
          total,
          hasNextPage,
        },
      },
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

    const normalizedCurrentMaster = NormalizeString(currentSkill.name);
    const aliasNames = dto.aliasNames || [];

    const allRows = await this.skillsSynonymsRepository.getAll([
      "aliasName",
      "masterName",
    ]);

    const conflicts = aliasNames.filter((alias) =>
      allRows.some(
        (row) =>
          NormalizeString(row.aliasName) === alias &&
          NormalizeString(row.masterName) !== normalizedCurrentMaster,
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
        { masterName: normalizedCurrentMaster },
        tx,
      );

      if (aliasNames.length > 0) {
        await this.skillsSynonymsRepository.createMany(
          aliasNames.map((aliasName) => ({
            masterName: normalizedCurrentMaster,
            aliasName,
            source: dto.source ?? "manual",
          })),
          tx,
        );
      }
    });

    const latestRows = await this.skillsSynonymsRepository.getByField({
      masterName: normalizedCurrentMaster,
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

    await this.skillRepository.mergeSkillsAndReferences(
      targetSkillId,
      sourceSkillIds,
    );

    this.logger.log(
      `Merged skills [${sourceSkillIds.join(", ")}] into target skill ${targetSkillId}`,
    );

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
