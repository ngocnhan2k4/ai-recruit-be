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
  GetMergeCandidatesQueryDto,
  GetSkillsSynonymsQueryDto,
  MergeSkillsDto,
  UpdateSkillSynonymDto,
} from "@/interfaces/dtos/skill-synonym/req/skill-synonym.dto";
import {
  MergeCandidateSkillDto,
  SkillSynonymResponseDto,
} from "@/interfaces/dtos/skill-synonym/res/skill-synonym.dto";
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import * as fuzz from "fuzzball";

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

  private scoreMergeCandidate(
    targetName: string,
    candidateName: string,
    targetAliases: Set<string>,
    candidateAliases: Set<string>,
  ): { score: number; reasons: string[] } {
    const target = NormalizeString(targetName);
    const candidate = NormalizeString(candidateName);
    const reasons: string[] = [];
    let score = 0;

    if (target.includes(candidate) || candidate.includes(target)) {
      score += 30;
      reasons.push("keyword-match");
    }

    const fuzzyScore = fuzz.token_sort_ratio(target, candidate);
    if (fuzzyScore >= 90) {
      score += 50;
      reasons.push("fuzzy-high");
    } else if (fuzzyScore >= 80) {
      score += 35;
      reasons.push("fuzzy-medium");
    } else if (fuzzyScore >= 70) {
      score += 20;
      reasons.push("fuzzy-low");
    }

    if (
      targetAliases.has(candidate) ||
      candidateAliases.has(target) ||
      [...targetAliases].some((alias) => candidateAliases.has(alias))
    ) {
      score += 40;
      reasons.push("synonym-link");
    }

    return {
      score,
      reasons: Array.from(new Set(reasons)),
    };
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

  async getMergeCandidates(
    skillId: string,
    query?: GetMergeCandidatesQueryDto,
  ): Promise<ApiResponse<MergeCandidateSkillDto[]>> {
    const targetSkill = await this.skillRepository.get(skillId);
    if (!targetSkill) {
      throw new NotFoundException({
        message: "Target skill not found",
        code: RESPONSE_CODE.SKILL_NOT_FOUND,
      });
    }

    const limit = query?.limit ?? 10;

    const [allSkills, allSynonyms] = await Promise.all([
      this.skillRepository.getAll(["id", "name"]),
      this.skillsSynonymsRepository.getAll(["masterName", "aliasName"]),
    ]);

    const targetSkillName = targetSkill.name;
    const normalizedTarget = NormalizeString(targetSkillName);

    const targetAliases = new Set<string>();
    const aliasesByMaster = new Map<string, Set<string>>();
    for (const row of allSynonyms) {
      const master = NormalizeString(row.masterName);
      const alias = NormalizeString(row.aliasName);
      if (!aliasesByMaster.has(master)) {
        aliasesByMaster.set(master, new Set());
      }
      aliasesByMaster.get(master)!.add(alias);

      if (master === normalizedTarget) {
        targetAliases.add(alias);
      }
    }

    const candidates = allSkills
      .filter((skill) => skill.id !== skillId)
      .map((skill) => {
        const normalizedCandidate = NormalizeString(skill.name);
        const candidateAliases =
          aliasesByMaster.get(normalizedCandidate) ?? new Set<string>();

        const { score, reasons } = this.scoreMergeCandidate(
          targetSkillName,
          skill.name,
          targetAliases,
          candidateAliases,
        );

        return {
          id: skill.id,
          name: skill.name,
          score,
          reasons,
        };
      })
      .filter((item) => item.score >= 40)
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .slice(0, limit);

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: candidates,
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
