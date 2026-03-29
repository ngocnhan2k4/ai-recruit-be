import {
  CrawledSkillResponse,
  GetListSkillResponse,
  Skill,
  SkillFilter,
  SkillReviewStatus,
} from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { GeneralQuery, PaginatedResult } from "@/common/types";

export type SkillWithQuestionCount = Skill & { questionCount: number };

export abstract class ISkillRepository extends IGenericRepository<Skill> {
  abstract createMany(skillValues: Pick<Skill, "name">[]): Promise<Skill[]>;

  abstract getPaginatedSkills(
    query: SkillFilter,
  ): Promise<PaginatedResult<GetListSkillResponse>>;

  abstract getSkillById(id: string): Promise<Pick<Skill, "name" | "id"> | null>;

  abstract getCrawledSkills(
    query: GeneralQuery,
  ): Promise<PaginatedResult<CrawledSkillResponse>>;

  abstract bulkReviewSkills(
    ids: string[],
    status: SkillReviewStatus,
  ): Promise<void>;
}
