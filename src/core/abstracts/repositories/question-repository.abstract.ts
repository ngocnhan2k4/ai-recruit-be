import { Question } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { GeneralQuery, PaginatedResult } from "@/common/types";

export interface QuestionFilters {
  skillId?: string;
  skillIds?: string[];
  /** Exclude questions that belong to this skill (e.g. for "add to skill" picker) */
  excludeSkillId?: string;
  difficultyLevels?: string[];
  isActive?: boolean;
}

export interface QuestionTranslationRecord {
  id: string;
  questionId: string;
  languageCode: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
}

export abstract class IQuestionRepository extends IGenericRepository<Question> {
  abstract getPaginatedQuestions(
    query: GeneralQuery & QuestionFilters,
  ): Promise<PaginatedResult<Question>>;

  abstract getActiveQuestionsBySkills(
    skillIds: string[],
    difficultyLevels?: string[],
  ): Promise<Question[]>;

  abstract createMany(questions: Partial<Question>[]): Promise<Question[]>;

  abstract toggleActive(id: string, isActive: boolean): Promise<Question>;

  abstract getQuestionByIdWithLanguage(id: string): Promise<Question | null>;

  abstract getQuestionsByIdsWithLanguage(ids: string[]): Promise<Question[]>;

  abstract getQuestionTranslation(
    questionId: string,
    languageCode: string,
  ): Promise<QuestionTranslationRecord | null>;

  abstract upsertQuestionTranslation(
    questionId: string,
    languageCode: string,
    data: Pick<
      QuestionTranslationRecord,
      "questionText" | "options" | "correctAnswer"
    >,
  ): Promise<QuestionTranslationRecord>;
}
