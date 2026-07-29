import { IGenericRepository } from "./generic-repository.abstract";
import { NewUserSkill, UserSkill, UserSkillResponse } from "@/core/entities";

export abstract class IUserSkillRepository extends IGenericRepository<UserSkill> {
  abstract getUserSkills(userId: string): Promise<UserSkillResponse[]>;
  abstract createMany(
    userSkills: Array<
      Pick<NewUserSkill, "userId" | "skillId"> & Partial<NewUserSkill>
    >,
  ): Promise<UserSkill[]>;
}
