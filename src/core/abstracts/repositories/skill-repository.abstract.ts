import {
  GetListSkillResponse,
  Skill,
  SkillFilter,
  SkillReviewStatus,
} from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { PaginatedResult } from "@/common/types";

export type SkillWithQuestionCount = Skill & { questionCount: number };

export abstract class ISkillRepository extends IGenericRepository<Skill> {
  abstract createMany(skillValues: Pick<Skill, "name">[]): Promise<Skill[]>;

  abstract getPaginatedSkills(
    query: SkillFilter,
  ): Promise<PaginatedResult<GetListSkillResponse>>;

  abstract getSkillById(id: string): Promise<Pick<Skill, "name" | "id"> | null>;

  abstract bulkReviewSkills(
    ids: string[],
    status: SkillReviewStatus,
  ): Promise<void>;

  abstract deleteSkillAndReferences(skillIds: string[]): Promise<void>;

  abstract mergeSkillsAndReferences(
    targetSkillId: string,
    sourceSkillIds: string[],
  ): Promise<void>;

  abstract getTopDemandedSkills(
    months: number,
    limit: number,
  ): Promise<{ name: string; jobCount: number }[]>;
}
