import { IUserExperienceRepository } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { Skill, UserExperience, Organization } from "@/core/entities";
import {
  companies,
  skills,
  userExperiences,
  users,
  userSkills,
} from "../models";
import { and, eq } from "drizzle-orm";
import { organizations } from "../models/organization.model";

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
        "organizationId" | "userId" | "createdAt" | "updatedAt" | "deletedAt"
      >;
      organization: Pick<
        Organization,
        | "id"
        | "name"
        | "slug"
        | "type"
        | "description"
        | "address"
        | "logoUrl"
        | "about"
        | "websiteUrl"
        | "email"
        | "phone"
        | "foundedYear"
        | "verifiedAt"
        | "organizationCulture"
        | "employeesMin"
        | "employeesMax"
        | "status"
        | "createdAt"
        | "updatedAt"
        | "deletedAt"
      > | null;
      skills: Skill[];
    }[]
  > {
    const rows = await this.db
      .select({
        experience: userExperiences,
        organization: organizations,
        skill: skills,
      })
      .from(userExperiences)
      .innerJoin(users, eq(users.id, userExperiences.userId))
      .leftJoin(
        organizations,
        eq(userExperiences.organizationId, organizations.id),
      )
      .leftJoin(
        userSkills,
        and(
          eq(userExperiences.organizationId, userSkills.organizationId),
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
                organizationId: row.experience.organizationId,
                position: row.experience.position,
                startDate: row.experience.startDate,
                endDate: row.experience.endDate,
                jobTitle: row.experience.jobTitle,
                description: row.experience.description,
              },
              organization: row.organization
                ? {
                    id: row.organization.id,
                    name: row.organization.name,
                    slug: row.organization.slug,
                    type: row.organization.type,
                    description: row.organization.description,
                    address: row.organization.address,
                    logoUrl: row.organization.logoUrl,
                    about: row.organization.about,
                    websiteUrl: row.organization.websiteUrl,
                    email: row.organization.email,
                    phone: row.organization.phone,
                    foundedYear: row.organization.foundedYear,
                    verifiedAt: row.organization.verifiedAt,
                    organizationCulture: row.organization.organizationCulture,
                    employeesMin: row.organization.employeesMin,
                    employeesMax: row.organization.employeesMax,
                    status: row.organization.status,
                    createdAt: row.organization.createdAt,
                    updatedAt: row.organization.updatedAt,
                    deletedAt: row.organization.deletedAt,
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
            organization: Pick<
              Organization,
              | "id"
              | "name"
              | "slug"
              | "type"
              | "description"
              | "address"
              | "logoUrl"
              | "about"
              | "websiteUrl"
              | "email"
              | "phone"
              | "foundedYear"
              | "verifiedAt"
              | "organizationCulture"
              | "employeesMin"
              | "employeesMax"
              | "status"
              | "createdAt"
              | "updatedAt"
              | "deletedAt"
            > | null;
            skills: Skill[];
          }
        >,
      ),
    );

    return grouped;
  }
}
