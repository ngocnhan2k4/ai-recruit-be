import { Skill } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { GeneralQuery, PaginatedResult } from "@/common/types";
import { SkillQuery } from "@/core/entities";

export type SkillWithQuestionCount = Skill & { questionCount: number };

export abstract class ISkillRepository extends IGenericRepository<Skill> {
  abstract createMany(skillValues: Pick<Skill, "name">[]): Promise<Skill[]>;
  abstract getPaginatedSkills(
    query: SkillQuery,
  ): Promise<PaginatedResult<Skill>>;
  abstract getSkillsWithQuestions(
    query: GeneralQuery,
  ): Promise<PaginatedResult<Skill>>;
  /** For admin: all skills with question count (including 0). */
  abstract getSkillsWithQuestionCount(
    query: GeneralQuery,
  ): Promise<PaginatedResult<SkillWithQuestionCount>>;

  abstract getSkillById(id: string): Promise<Skill | null>;
}
