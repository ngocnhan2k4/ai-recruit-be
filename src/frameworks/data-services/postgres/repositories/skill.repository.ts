import { ISkillRepository, Skill } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { skills } from "../models";

@Injectable()
export class SkillRepository
  extends GenericRepository<Skill, typeof skills>
  implements ISkillRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, skills);
  }

  async createMany(skillValues: Omit<Skill, "id">[]): Promise<Skill[]> {
    const result = await this.db
      .insert(skills)
      .values(skillValues)
      .onConflictDoNothing({
        target: [skills.name],
      })
      .returning();

    return result;
  }
}
