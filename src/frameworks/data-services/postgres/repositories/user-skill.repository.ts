import { IUserSkillRepository, Skill } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { userSkills, skills, users } from "../models";
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

  async getUserSkills(userName: string): Promise<
    {
      userId: string;
      userName: string;
      skill: Skill;
    }[]
  > {
    const result = await this.db
      .select({
        userName: users.username,
        skill: skills,
      })
      .from(users)
      .innerJoin(userSkills, eq(users.id, userSkills.userId))
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(users.username, userName));

    return result as {
      userId: string;
      userName: string;
      skill: Skill;
    }[];
  }
}
