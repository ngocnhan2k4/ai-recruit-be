import { ISkillRepository, SkillSynonym } from "@/core";
import { skillsSynonyms } from "../models/skills-synonyms.model";
import { ISkillsSynonymsRepository } from "@/core/abstracts/repositories/skills-synonyms-repository.abstract";
import { GenericRepository } from "./generic-repository";
import type { DBDrizzle } from "../types";
import { Inject, Injectable } from "@nestjs/common";
import { SynonymSkillResponse } from "@/core/entities/skill-synonym.entity";
import * as fuzz from "fuzzball";

@Injectable()
export class SkillsSynonymsRepository
  extends GenericRepository<SkillSynonym, typeof skillsSynonyms>
  implements ISkillsSynonymsRepository
{
  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    private readonly skillRepository: ISkillRepository,
  ) {
    super(db, skillsSynonyms);
  }

  async getSynonymsSkills(skillNames: string[]): Promise<SynonymSkillResponse> {
    const threshold = 90;

    // Fetch all existing skills and synonyms from DB
    const [allSkills, allSynonyms] = await Promise.all([
      this.skillRepository.getAll(["id", "name"]),
      this.getAll(["id", "masterName", "aliasName"]),
    ]);

    // Create a map for fast lookup and lists for fuzzy matching

    // Skills Table
    const skillNameMap = new Map<string, string>();
    const skillIdToName = new Map<string, string>();
    allSkills.forEach((s) => {
      skillNameMap.set(s.name.toLowerCase(), s.id);
      skillIdToName.set(s.id, s.name);
    });

    // Skills Synonyms Table
    const synonymMap = new Map<string, string>();
    allSynonyms.forEach((syn) => {
      synonymMap.set(syn.aliasName.toLowerCase(), syn.masterName);
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
        const masterName = synonymMap.get(normalizedInput)!;
        const skillId = skillNameMap.get(masterName.toLowerCase());
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
        const masterName = synonymMap.get(matchedSynName)!;
        const skillId = skillNameMap.get(masterName.toLowerCase());
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
