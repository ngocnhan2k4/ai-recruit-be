import { Skill } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { GeneralQuery, PaginatedResult } from "@/common/types/api";

export abstract class ISkillRepository extends IGenericRepository<Skill> {
  abstract createMany(skillValues: Pick<Skill, "name">[]): Promise<Skill[]>;
  abstract getPaginatedSkills(
    query: GeneralQuery,
  ): Promise<PaginatedResult<Skill>>;
  abstract getSkillsWithQuestions(
    query: GeneralQuery,
  ): Promise<PaginatedResult<Skill>>;
}
