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

  private normalizeMaster(value: string): string {
    return NormalizeString(value);
  }

  private buildGroupedResponse(
    skills: Pick<Skill, "id" | "name">[],
    rows: Pick<SkillSynonym, "masterName" | "aliasName">[],
  ): SkillSynonymResponseDto[] {
    const aliasMap = new Map<string, Set<string>>();

    for (const row of rows) {
      const normalizedMaster = this.normalizeMaster(row.masterName);
      if (!aliasMap.has(normalizedMaster)) {
        aliasMap.set(normalizedMaster, new Set());
      }
      aliasMap.get(normalizedMaster)!.add(row.aliasName);
    }

    return skills
      .map((skill) => {
        const normalizedSkillName = this.normalizeMaster(skill.name);
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

    const [allSkills, allRows] = await Promise.all([
      this.skillRepository.getAll(["id", "name"]),
      this.skillsSynonymsRepository.getAll(["masterName", "aliasName"]),
    ]);

    const grouped = this.buildGroupedResponse(allSkills, allRows);

    const filtered = keyword
      ? grouped.filter(
          (item) =>
            this.normalizeMaster(item.masterName).includes(keyword) ||
            item.aliasNames.some((alias) =>
              this.normalizeMaster(alias).includes(keyword),
            ),
        )
      : grouped;

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
    currentMasterName: string,
    dto: UpdateSkillSynonymDto,
  ): Promise<ApiResponse<SkillSynonymResponseDto>> {
    const normalizedCurrentMaster = this.normalizeMaster(currentMasterName);
    const nextSkillName = dto.masterName?.trim();
    const targetMasterName = this.normalizeMaster(
      nextSkillName || normalizedCurrentMaster,
    );
    const aliasNames = this.normalizeAliases(dto.aliasNames);

    if (!normalizedCurrentMaster) {
      throw new BadRequestException("masterName is required");
    }
    if (!targetMasterName) {
      throw new BadRequestException("masterName is required");
    }

    const allSkills = await this.skillRepository.getAll(["id", "name"]);
    const currentSkill = allSkills.find(
      (skill) => this.normalizeMaster(skill.name) === normalizedCurrentMaster,
    );

    if (!currentSkill) {
      throw new NotFoundException("Master skill not found");
    }

    if (nextSkillName && targetMasterName !== normalizedCurrentMaster) {
      const duplicatedSkill = allSkills.find(
        (skill) =>
          this.normalizeMaster(skill.name) === targetMasterName &&
          skill.id !== currentSkill.id,
      );

      if (duplicatedSkill) {
        throw new BadRequestException(
          "Master skill already exists in skills table",
        );
      }

      await this.skillRepository.update(
        { id: currentSkill.id },
        { name: nextSkillName },
      );
    }

    const allRows = await this.skillsSynonymsRepository.getAll([
      "aliasName",
      "masterName",
    ]);
    const conflicts = aliasNames.filter((alias) =>
      allRows.some(
        (row) =>
          this.normalizeMaster(row.aliasName) === alias &&
          this.normalizeMaster(row.masterName) !== normalizedCurrentMaster &&
          this.normalizeMaster(row.masterName) !== targetMasterName,
      ),
    );

    if (conflicts.length > 0) {
      throw new BadRequestException(
        `Alias already exists: ${conflicts.join(", ")}`,
      );
    }

    if (normalizedCurrentMaster !== targetMasterName) {
      await this.skillsSynonymsRepository.update(
        { masterName: normalizedCurrentMaster },
        { masterName: targetMasterName },
      );
    }

    const existingTargetRows = await this.skillsSynonymsRepository.getByField({
      masterName: targetMasterName,
    });

    const existingAliasSet = new Set(
      existingTargetRows.map((row) => this.normalizeMaster(row.aliasName)),
    );

    const aliasToInsert = aliasNames.filter(
      (alias) => !existingAliasSet.has(alias),
    );

    if (aliasToInsert.length > 0) {
      await this.skillsSynonymsRepository.createMany(
        aliasToInsert.map((aliasName) => ({
          masterName: targetMasterName,
          aliasName,
          source: dto.source ?? "manual",
        })),
      );
    }

    this.logger.log(
      `Updated skill synonyms for master: ${normalizedCurrentMaster} -> ${targetMasterName}`,
    );

    const latestRows = await this.skillsSynonymsRepository.getByField({
      masterName: targetMasterName,
    });

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        id: currentSkill.id,
        masterName: nextSkillName || currentSkill.name,
        aliasNames: latestRows
          .map((row) => row.aliasName)
          .sort((a, b) => a.localeCompare(b)),
      },
    };
  }

  async deleteSkillSynonym(skillId: string): Promise<ApiResponse<void>> {
    if (!skillId) {
      throw new BadRequestException("skillId is required");
    }

    const targetSkill = await this.skillRepository.get(skillId);

    if (!targetSkill) {
      throw new NotFoundException("Skill not found");
    }

    const normalizedMasterName = this.normalizeMaster(targetSkill.name);

    await this.skillRepository.deleteSkillAndReferences(targetSkill.id);

    await this.skillsSynonymsRepository.deletePermanently({
      masterName: normalizedMasterName,
    });

    this.logger.log(`Deleted skill synonyms for skillId: ${skillId}`);

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
