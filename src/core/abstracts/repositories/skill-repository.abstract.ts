import { Skill } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { GeneralQuery, PaginatedResult } from "@/common/types";

export type SkillWithQuestionCount = Skill & { questionCount: number };

export abstract class ISkillRepository extends IGenericRepository<Skill> {
  abstract createMany(skillValues: Pick<Skill, "name">[]): Promise<Skill[]>;
  abstract getPaginatedSkills(
    query: GeneralQuery,
  ): Promise<PaginatedResult<Skill>>;
  abstract getSkillsWithQuestions(
    query: GeneralQuery,
  ): Promise<PaginatedResult<Skill>>;
  /** For admin: skills that have questions, with questionCount, pagination and sort (name | questionCount). */
  abstract getSkillsWithQuestionCount(
    query: GeneralQuery & {
      sortBy?: "name" | "questionCount";
      sortDirection?: "asc" | "desc";
    },
  ): Promise<PaginatedResult<SkillWithQuestionCount>>;

  /** Get a single skill by id with question count. Returns null if not found. */
  abstract getSkillWithQuestionCount(
    id: string,
  ): Promise<SkillWithQuestionCount | null>;
}
