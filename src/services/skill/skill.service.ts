import { PaginatedResult } from "@/common/types";
import { normalizeString } from "@/common/utils";
import {
  ISkillRepository,
  ISkillsSynonymsRepository,
  Skill,
  SkillFilter,
  SkillSynonym,
  SkillSynonymResponse,
} from "@/core";
import { ISkillService } from "@/core/abstracts/skill-services.abstract";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class SkillService implements ISkillService {
  private readonly logger = new Logger(SkillService.name);
  constructor(
    private readonly skillRepository: ISkillRepository,
    private readonly skillsSynonymsRepository: ISkillsSynonymsRepository,
  ) {}

  private buildGroupedSkill(
    skills: Pick<Skill, "id" | "name">[],
    rows: Pick<SkillSynonym, "masterName" | "aliasName">[],
  ): SkillSynonymResponse[] {
    const aliasMap = new Map<string, Set<string>>();

    for (const row of rows) {
      const normalizedMaster = normalizeString(row.masterName);
      if (!aliasMap.has(normalizedMaster)) {
        aliasMap.set(normalizedMaster, new Set());
      }
      aliasMap.get(normalizedMaster)!.add(row.aliasName);
    }

    return skills
      .map((skill) => {
        const normalizedSkillName = normalizeString(skill.name);
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
    query: SkillFilter,
  ): Promise<PaginatedResult<SkillSynonymResponse>> {
    this.logger.log(
      `[SkillService] [getSkillsSynonyms]: ${JSON.stringify(query)}`,
    );

    const page = Math.max(query?.page ?? 1, 1);
    const limit = Math.max(query?.limit ?? 10, 1);
    const keyword = query?.keyword?.trim().toLowerCase();
    const exactNames = (query?.exactNames ?? []).map((name) =>
      normalizeString(name),
    );
    const hasSynonyms = query?.hasSynonyms;
    const skipCount = query?.skipCount;

    const [allSkills, allRows] = await Promise.all([
      this.skillRepository.getAll(["id", "name"]),
      this.skillsSynonymsRepository.getAll(["masterName", "aliasName"]),
    ]);
    const grouped = this.buildGroupedSkill(allSkills, allRows);
    const filtered = grouped.filter((item) => {
      const matchesKeyword = keyword
        ? normalizeString(item.masterName).includes(keyword) ||
          item.aliasNames.some((alias) =>
            normalizeString(alias).includes(keyword),
          )
        : true;

      const matchesExactNames = exactNames
        ? exactNames.includes(normalizeString(item.masterName)) ||
          exactNames.some((name) =>
            item.aliasNames.map(normalizeString).includes(name),
          )
        : true;

      const hasAlias = item.aliasNames.length > 0;
      const matchesSynonymFilter =
        hasSynonyms === undefined ? true : hasSynonyms === hasAlias;

      return matchesKeyword && matchesExactNames && matchesSynonymFilter;
    });

    const total = filtered.length;
    const offset = (page - 1) * limit;
    const data = skipCount ? filtered : filtered.slice(offset, offset + limit);
    const hasNext = offset + limit < total;

    this.logger.log(
      `[SkillService] [getSkillsSynonyms]: total=${total}, offset=${offset}, data=${JSON.stringify(data)}, hasNext=${hasNext}`,
    );

    return {
      data,
      pagination: {
        total,
        hasNextPage: hasNext,
      },
    } as PaginatedResult<SkillSynonymResponse>;
  }
}
