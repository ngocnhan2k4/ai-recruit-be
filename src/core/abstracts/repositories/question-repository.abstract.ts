import { Question } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { GeneralQuery, PaginatedResult } from "@/common/types/api";

export interface QuestionFilters {
  areaId?: string;
  skillId?: string;
  skillIds?: string[];
  difficulty?: string;
  isActive?: boolean;
}

export abstract class IQuestionRepository extends IGenericRepository<Question> {
  abstract getPaginatedQuestions(
    query: GeneralQuery & QuestionFilters,
  ): Promise<PaginatedResult<Question>>;

  abstract getActiveQuestionsBySkills(
    skillIds: string[],
    areaId?: string,
  ): Promise<Question[]>;

  abstract createMany(questions: Partial<Question>[]): Promise<Question[]>;

  abstract toggleActive(id: string, isActive: boolean): Promise<Question>;
}
