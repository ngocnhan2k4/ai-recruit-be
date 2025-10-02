import { IGenericRepository } from "./generic-repository.abstract";
import { UserSkill } from "@/core/entities";

export abstract class IUserSkillRepository extends IGenericRepository<UserSkill> {}
