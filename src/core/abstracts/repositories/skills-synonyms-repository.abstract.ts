import { SkillSynonym } from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";
import { SynonymSkillResponse } from "@/core/entities/skill-synonym.entity";

export abstract class ISkillsSynonymsRepository extends IGenericRepository<SkillSynonym> {
  abstract getSynonymsSkills(
    skillNames: string[],
  ): Promise<SynonymSkillResponse>;
}
