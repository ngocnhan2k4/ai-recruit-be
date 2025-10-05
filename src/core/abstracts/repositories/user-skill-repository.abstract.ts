import { IGenericRepository } from "./generic-repository.abstract";
import { Skill, UserSkill } from "@/core/entities";

export abstract class IUserSkillRepository extends IGenericRepository<UserSkill> {
  abstract getUserSkills(userName: string): Promise<
    {
      userId: string;
      skill: Skill;
    }[]
  >;
}
