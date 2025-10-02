import { IGenericRepository } from "../generic-repository.abstract";
import { UserSkill } from "@/core/entities";

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export abstract class IUserSkillRepository extends IGenericRepository<UserSkill> {}
