import { IUserExperienceRepository } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { Company, Skill, UserExperience } from "@/core/entities";
import {
  companies,
  skills,
  userExperiences,
  users,
  userSkills,
} from "../models";
import { and, eq } from "drizzle-orm";

@Injectable()
export class UserExperienceRepository
  extends GenericRepository<UserExperience, typeof userExperiences>
  implements IUserExperienceRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userExperiences);
  }

  async getUserExperiencesByUsername(username: string): Promise<
    {
      experience: Omit<
        UserExperience,
        "companyId" | "userId" | "createdAt" | "updatedAt" | "deletedAt"
      >;
      company: Pick<Company, "id" | "name" | "logoUrl" | "address"> | null;
      skills: Skill[];
    }[]
  > {
    const rows = await this.db
      .select({
        experience: userExperiences,
        company: companies,
        skill: skills,
      })
      .from(userExperiences)
      .innerJoin(users, eq(users.id, userExperiences.userId))
      .leftJoin(companies, eq(userExperiences.companyId, companies.id))
      .leftJoin(
        userSkills,
        and(
          eq(userExperiences.companyId, userSkills.companyId),
          eq(userExperiences.userId, userSkills.userId),
        ),
      )
      .leftJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(users.username, username));

    const grouped = Object.values(
      rows.reduce(
        (acc, row) => {
          const expId = row.experience.id;
          if (!acc[expId]) {
            acc[expId] = {
              experience: {
                id: row.experience.id,
                position: row.experience.position,
                startDate: row.experience.startDate,
                endDate: row.experience.endDate,
                jobTitle: row.experience.jobTitle,
                description: row.experience.description,
              },
              company: row.company
                ? {
                    id: row.company.id,
                    name: row.company.name,
                    logoUrl: row.company.logoUrl,
                    address: row.company.address,
                  }
                : null,
              skills: [],
            };
          }

          if (row.skill) {
            acc[expId].skills.push({
              id: row.skill.id,
              name: row.skill.name,
            });
          }

          return acc;
        },
        {} as Record<
          string,
          {
            experience: Omit<
              UserExperience,
              "companyId" | "userId" | "createdAt" | "updatedAt" | "deletedAt"
            >;
            company: Pick<
              Company,
              "id" | "name" | "logoUrl" | "address"
            > | null;
            skills: Skill[];
          }
        >,
      ),
    );

    return grouped;
  }
}
