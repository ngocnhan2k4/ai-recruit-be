import { GetListSkillResponse, Skill, SkillFilter } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { PaginatedResult } from "@/common/types";

export type SkillWithQuestionCount = Skill & { questionCount: number };

export abstract class ISkillRepository extends IGenericRepository<Skill> {
  abstract createMany(skillValues: Pick<Skill, "name">[]): Promise<Skill[]>;

  abstract getPaginatedSkills(
    query: SkillFilter,
  ): Promise<PaginatedResult<GetListSkillResponse>>;

  abstract getSkillById(id: string): Promise<Pick<Skill, "name" | "id"> | null>;
}
