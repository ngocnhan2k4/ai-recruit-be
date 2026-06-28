import {
  Subpath,
  SubpathWithDetails,
  OptionResourceCompletion,
  SubpathModuleQuizResult,
  AISubpathResult,
} from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class ISubpathRepository extends IGenericRepository<Subpath> {
  abstract findByKey(
    optionName: string,
    targetRole: string,
    currentRole: string,
  ): Promise<SubpathWithDetails | null>;

  abstract createFromAIResult(
    payload: { optionName: string; targetRole: string; currentRole: string },
    aiResult: AISubpathResult,
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

  abstract getManyByFields(
    userId: string,
    resourceIds: string[],
  ): Promise<OptionResourceCompletion[]>;
}

export abstract class ISubpathModuleQuizResultRepository extends IGenericRepository<SubpathModuleQuizResult> {
  abstract upsert(
    userId: string,
    moduleId: string,
    score: number,
    totalQuestions: number,
  ): Promise<SubpathModuleQuizResult>;
}
