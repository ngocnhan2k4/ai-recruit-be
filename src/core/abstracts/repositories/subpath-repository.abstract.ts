import {
  OptionSubpath,
  SubpathWithDetails,
  OptionResourceCompletion,
  SubpathModuleQuizResult,
  AISubpathResult,
} from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class IOptionSubpathRepository extends IGenericRepository<OptionSubpath> {
  abstract getByOptionId(optionId: string): Promise<SubpathWithDetails | null>;

  abstract createFromAIResult(
    payload: { optionId?: string; skillId?: string },
    aiResult: AISubpathResult,
    tx?: any,
  ): Promise<SubpathWithDetails>;
}

export abstract class IOptionResourceCompletionRepository extends IGenericRepository<OptionResourceCompletion> {
  abstract markCompleted(
    userId: string,
    resourceId: string,
  ): Promise<OptionResourceCompletion>;

  abstract markUncompleted(userId: string, resourceId: string): Promise<void>;

  abstract toggleCompletion(
    userId: string,
    resourceId: string,
  ): Promise<{ completed: boolean }>;
}

export abstract class ISubpathModuleQuizResultRepository extends IGenericRepository<SubpathModuleQuizResult> {
  abstract upsert(
    userId: string,
    moduleId: string,
    score: number,
    totalQuestions: number,
  ): Promise<SubpathModuleQuizResult>;
}
