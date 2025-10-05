import { IUserExperienceRepository } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import {
  companies,
  skills,
  userExperiences,
  users,
  userSkills,
} from "../models";
import { Company, Skill, UserExperience } from "@/core/entities";
import { and, eq } from "drizzle-orm";

@Injectable()
export class UserExperienceRepository
  extends GenericRepository<UserExperience, typeof userExperiences>
  implements IUserExperienceRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userExperiences);
  }

  async getUserExperiences(userName: string): Promise<
    {
      userName: string;
      experience: UserExperience;
      company: Company;
      skill: Skill;
    }[]
  > {
    const result = await this.db
      .select({
        userName: users.username,
        experience: userExperiences,
        company: companies,
        skill: skills,
      })
      .from(users)
      .innerJoin(userExperiences, eq(users.id, userExperiences.userId))
      .leftJoin(companies, eq(userExperiences.companyId, companies.id))
      .leftJoin(
        userSkills,
        and(
          eq(userExperiences.companyId, userSkills.companyId),
          eq(userExperiences.userId, userSkills.userId),
        ),
      )
      .leftJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(users.username, userName));

    return result as {
      userName: string;
      experience: UserExperience;
      company: Company;
      skill: Skill;
    }[];
  }
}
