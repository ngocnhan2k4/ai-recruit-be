import { IGenericRepository } from "./generic-repository.abstract";
import { Skill, UserSkill } from "@/core/entities";

export abstract class IUserSkillRepository extends IGenericRepository<UserSkill> {
  abstract getUserSkills(username: string): Promise<Skill[]>;
}
