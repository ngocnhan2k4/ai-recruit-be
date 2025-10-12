import { Skill } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class ISkillRepository extends IGenericRepository<Skill> {
  abstract createMany(skillValues: Omit<Skill, "id">[]): Promise<Skill[]>;
}
