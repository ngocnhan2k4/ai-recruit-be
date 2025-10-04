import { IUserSkillRepository } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { skills, userSkills } from "../models";
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

  async getByUserId(userId: string): Promise<{ id: string; name: string }[]> {
    const result = await this.db
      .select({
        id: userSkills.skillId,
        name: skills.name,
      })
      .from(userSkills)
      .innerJoin(skills, eq(skills.id, userSkills.skillId))
      .where(eq(userSkills.userId, userId));
    return result as { id: string; name: string }[];
  }
}
