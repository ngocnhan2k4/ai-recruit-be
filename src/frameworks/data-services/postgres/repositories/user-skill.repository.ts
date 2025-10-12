import { IUserSkillRepository, Skill } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { skills, users, userSkills } from "../models";
import { UserSkill } from "@/core";
import { eq } from "drizzle-orm";

@Injectable()
export class UserSkillRepository
  extends GenericRepository<UserSkill, typeof userSkills>
  implements IUserSkillRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userSkills);
  }

  async getUserSkills(username: string): Promise<Skill[]> {
    const result = await this.db
      .select({ id: skills.id, name: skills.name })
      .from(users)
      .innerJoin(userSkills, eq(users.id, userSkills.userId))
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(users.username, username));

    return result as Skill[];
  }

  async createMany(userSkillValues: UserSkill[]): Promise<UserSkill[]> {
    const result = await this.db
      .insert(userSkills)
      .values(userSkillValues)
      .onConflictDoNothing({
        target: [userSkills.userId, userSkills.skillId],
      })
      .returning();

    return result;
  }
}
