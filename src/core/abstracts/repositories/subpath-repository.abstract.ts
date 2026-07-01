import {
  Subpath,
  SubpathWithDetails,
  OptionResourceCompletion,
  SubpathModuleQuizResult,
  AISubpathResult,
} from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class ISubpathRepository extends IGenericRepository<Subpath> {
  abstract findByOptionId(optionId: string): Promise<SubpathWithDetails | null>;

  abstract createFromAIResult(
    payload: {
      optionName: string;
      targetRole: string;
      currentRole: string;
    },
    aiResult: AISubpathResult,
  ): Promise<SubpathWithDetails>;

  abstract getUserSubpathByOptionId(
    optionId: string,
  ): Promise<{ id: string; snapshotOfId: string } | null>;

  abstract cloneSharedSubpathForUser(
    sharedSubpathId: string,
    roadmapSkillOptionId: string,
    userId: string,
  ): Promise<{ id: string }>;

  abstract addResourcesToModule(
    moduleId: string,
    resources: Array<{
      title: string;
      url: string;
      type: string;
      isFree?: boolean;
    }>,
  ): Promise<void>;

  abstract deleteResource(resourceId: string): Promise<void>;
  abstract deleteModule(moduleId: string): Promise<void>;

  abstract addModule(
    userSubpathId: string,
    module: {
      title: string;
      description: string;
      duration: string;
      category?: string;
      concepts: string[];
    },
  ): Promise<{ id: string; title: string }>;
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
