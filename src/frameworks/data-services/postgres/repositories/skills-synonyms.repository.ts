import { ICacheService, ISkillRepository, SkillSynonym } from "@/core";
import { ISkillsSynonymsRepository } from "@/core/abstracts/repositories/skills-synonyms-repository.abstract";
import { GenericRepository } from "./generic-repository";
import type { DBDrizzle } from "../types";
import { Inject, Injectable, Logger } from "@nestjs/common";
import { SynonymSkillResponse } from "@/core/entities/skill-synonym.entity";
import * as fuzz from "fuzzball";
import { CACHE_KEYS, SHORT_TTL, VERY_LONG_TTL } from "@/common/constants";
import { cacheWithDedup } from "@/common/utils";
import { skillsSynonyms } from "../models";

@Injectable()
export class SkillsSynonymsRepository
  extends GenericRepository<SkillSynonym, typeof skillsSynonyms>
  implements ISkillsSynonymsRepository
{
  private readonly logger = new Logger(SkillsSynonymsRepository.name);

  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    @Inject(ICacheService) private readonly cacheService: ICacheService,
    private readonly skillRepository: ISkillRepository,
  ) {
    super(db, skillsSynonyms);
  }
  ss;
  async getSynonymsSkills(skillNames: string[]): Promise<SynonymSkillResponse> {
    const synonymKey = CACHE_KEYS.skillSynonym.getAll();
    const skillsKey = CACHE_KEYS.skill.getAll();
    const threshold = 90;

    // Fetch all existing skills and synonyms from DB
    const [allSkills, allSynonyms] = await Promise.all([
      cacheWithDedup<Pick<any, "id" | "name" | "isApproved">[]>(
        skillsKey,
        async () =>
          (await this.cacheService.getJson<
            Pick<any, "id" | "name" | "isApproved">[]
          >(skillsKey)) ?? undefined,
        () => this.skillRepository.getAll(["id", "name", "isApproved"]),
        (data) => this.cacheService.setJson(skillsKey, data, SHORT_TTL),
        { logger: this.logger },
      ),
      cacheWithDedup<
        Pick<SkillSynonym, "id" | "masterSkillId" | "aliasName">[]
      >(
        synonymKey,
        async () =>
          (await this.cacheService.getJson<
            Pick<SkillSynonym, "id" | "masterSkillId" | "aliasName">[]
          >(synonymKey)) ?? undefined,
        () => this.getAll(["id", "masterSkillId", "aliasName"]),
        (data: Pick<SkillSynonym, "id" | "masterSkillId" | "aliasName">[]) =>
          this.cacheService.setJson(synonymKey, data, VERY_LONG_TTL),
        {
          logger: this.logger,
        },
      ),
    ]);

    const approvedSkillNames = allSkills.filter((s) => s.isApproved);

    // Create a map for fast lookup and lists for fuzzy matching

    // Skills Table
    const skillNameMap = new Map<string, string>();
    const skillIdToName = new Map<string, string>();
    approvedSkillNames.forEach((s) => {
      skillNameMap.set(s.name.toLowerCase(), s.id);
      skillIdToName.set(s.id, s.name);
    });

    // Skills Synonyms Table
    const synonymMap = new Map<string, string[]>();
    allSynonyms.forEach((syn) => {
      const key = syn.aliasName.toLowerCase();
      const existing = synonymMap.get(key) ?? [];
      existing.push(syn.masterSkillId);
      synonymMap.set(key, existing);
    });

    const choices = Array.from(skillNameMap.keys());
    const synonymChoices = Array.from(synonymMap.keys());

    const result: SynonymSkillResponse = {
      matches: {},
      pendingSkills: [],
    };

    for (const inputName of skillNames) {
      const normalizedInput = inputName.trim().toLowerCase();
      if (!normalizedInput) continue;

      // Exact Match with Skills Table
      if (skillNameMap.has(normalizedInput)) {
        const skillId = skillNameMap.get(normalizedInput)!;
        result.matches[inputName] = {
          skillId,
          resolvedName: skillIdToName.get(skillId) || "",
        };
        continue;
      }

      // Exact Match with Synonyms Table
      if (synonymMap.has(normalizedInput)) {
        const candidateSkillIds = synonymMap.get(normalizedInput)!;
        const skillId = candidateSkillIds.find((id) => skillIdToName.has(id));
        if (skillId) {
          result.matches[inputName] = {
            skillId,
            resolvedName: skillIdToName.get(skillId) || "",
          };
          continue;
        }
      }

      // Fuzzy Match with Master Skills
      const skillFuzzy = fuzz.extract(normalizedInput, choices, {
        scorer: fuzz.token_sort_ratio,
        limit: 1,
      });

      if (skillFuzzy.length > 0 && skillFuzzy[0][1] >= threshold) {
        const matchedName = skillFuzzy[0][0];
        const skillId = skillNameMap.get(matchedName)!;
        result.matches[inputName] = {
          skillId,
          resolvedName: skillIdToName.get(skillId) || "",
        };
        continue;
      }

      // Fuzzy Match with Synonyms
      const synFuzzy = fuzz.extract(normalizedInput, synonymChoices, {
        scorer: fuzz.token_sort_ratio,
        limit: 1,
      });

      if (synFuzzy.length > 0 && synFuzzy[0][1] >= threshold) {
        const matchedSynName = synFuzzy[0][0];
        const candidateSkillIds = synonymMap.get(matchedSynName)!;
        const skillId = candidateSkillIds.find((id) => skillIdToName.has(id));
        if (skillId) {
          result.matches[inputName] = {
            skillId,
            resolvedName: skillIdToName.get(skillId) || "",
          };
          continue;
        }
      }

      // No match found
      result.pendingSkills.push(inputName);
    }

    return result;
  }
}
