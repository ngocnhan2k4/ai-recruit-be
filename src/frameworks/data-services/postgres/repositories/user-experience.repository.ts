import { IOrganizationRepository, IUserExperienceRepository } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { DBDrizzleTransaction, type DBDrizzle } from "../types";
import {
  Skill,
  UserExperience,
  OrganizationTypeEnum,
  OrganizationWithDetails,
} from "@/core/entities";
import { skills, userExperiences, users, userSkills } from "../models";
import { and, eq } from "drizzle-orm";
import { organizations } from "../models/organization.model";
import { CreateUserExperience } from "@/core/entities/user.entity";
import {
  convertDateToStr,
  resolveLanguageContext,
  slugify,
} from "@/common/utils";

@Injectable()
export class UserExperienceRepository
  extends GenericRepository<UserExperience, typeof userExperiences>
  implements IUserExperienceRepository
{
  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    private readonly organizationRepository: IOrganizationRepository,
  ) {
    super(db, userExperiences);
  }

  async getUserExperiencesByUsername(
    username: string,
    requestLanguage?: string,
    fallbackLanguage?: string,
  ): Promise<
    {
      experience: Omit<
        UserExperience,
        "organizationId" | "userId" | "createdAt" | "updatedAt" | "deletedAt"
      >;
      organization: Pick<
        OrganizationWithDetails,
        "id" | "name" | "address" | "logoUrl"
      >;
      skills: Pick<Skill, "id" | "name">[];
    }[]
  > {
    const resolvedLanguages = resolveLanguageContext({
      requestLanguage,
      fallbackLanguage,
    });
    const getRowsByLanguage = async (languageCode: string) =>
      this.db
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
        .where(
          and(
            eq(users.username, username),
            eq(userExperiences.languageCode, languageCode),
          ),
        );

    let rows = await getRowsByLanguage(resolvedLanguages.requestLanguage);
    if (
      !rows.length &&
      resolvedLanguages.requestLanguage !== resolvedLanguages.fallbackLanguage
    ) {
      rows = await getRowsByLanguage(resolvedLanguages.fallbackLanguage);
    }

    if (!rows.length) {
      rows = await this.db
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
    }

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
                languageCode: row.experience.languageCode,
              },
              organization: {
                id: row.organization?.id || "",
                name: row.organization?.name || "",
                address: row.organization?.address || [],
                logoUrl: row.organization?.logoUrl || "",
              },
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
              OrganizationWithDetails,
              "id" | "name" | "address" | "logoUrl"
            >;
            skills: Pick<Skill, "id" | "name">[];
          }
        >,
      ),
    );

    return grouped;
  }

  private async preCreateBeforeCreateUserExperience(
    tx: DBDrizzleTransaction,
    userId: string,
    data: CreateUserExperience,
  ) {
    let organizationId = data.organizationId;

    const organizationExists = organizationId
      ? await this.organizationRepository.get(organizationId)
      : null;

    if (!organizationExists) {
      const [organization] = await tx
        .insert(organizations)
        .values({
          name: data.organizationName || "",
          type: OrganizationTypeEnum.COMPANY,
          slug: slugify(data.organizationName || ""),
        })
        .returning();
      organizationId = organization.id;
    } else {
      organizationId = organizationExists.id;
    }
    const skillIds = data.skillIds || [];
    const skillNames = data.skillNames || [];

    // Process skill names to get or create skill IDs
    if (skillNames.length > 0) {
      const newSkills = await tx
        .insert(skills)
        .values(skillNames.map((name) => ({ name })))
        .returning();
      skillIds.push(...newSkills.map((skill) => skill.id));
    }

    // Create user-skill associations
    if (skillIds.length > 0)
      await tx
        .insert(userSkills)
        .values(
          skillIds.map((skillId) => ({
            userId,
            organizationId: organizationId || null,
            skillId,
          })),
        )
        .returning();
    return {
      organizationId,
    };
  }

  async createUserExperienceWithCompanyAndSkills(
    userId: string,
    data: CreateUserExperience,
  ): Promise<UserExperience> {
    const tx = await this.db.transaction(async (tx) => {
      const { organizationId } = await this.preCreateBeforeCreateUserExperience(
        tx,
        userId,
        data,
      );

      const [result] = await tx
        .insert(userExperiences)
        .values({
          ...data,
          userId,
          organizationId,
          startDate: convertDateToStr(data.startDate),
          endDate: data.endDate ? convertDateToStr(data.endDate) : null,
        })
        .returning();
      return result;
    });
    return tx;
  }

  async updateUserExperienceWithCompanyAndSkills(
    userId: string,
    id: number,
    data: CreateUserExperience,
  ): Promise<UserExperience | null> {
    const [userExperience] = await this.getByField({ userId, id });
    if (!userExperience) {
      return null;
    }
    const tx = await this.db.transaction(async (tx) => {
      await tx
        .delete(userSkills)
        .where(
          and(
            eq(userSkills.userId, userId),
            eq(userSkills.organizationId, userExperience.organizationId),
          ),
        );
      const { organizationId } = await this.preCreateBeforeCreateUserExperience(
        tx,
        userId,
        data,
      );

      const updatedUserExperience = {
        ...userExperience,
        ...data,
        organizationId,
      };
      const [result] = await tx
        .update(userExperiences)
        .set({
          ...updatedUserExperience,
          startDate: convertDateToStr(data.startDate),
          endDate: data.endDate ? convertDateToStr(data.endDate) : null,
        })
        .where(
          and(eq(userExperiences.id, id), eq(userExperiences.userId, userId)),
        )
        .returning();
      return result;
    });
    return tx;
  }

  async deleteUserExperienceAndUserSkills(
    userId: string,
    experienceId: number,
  ): Promise<boolean> {
    return await this.db.transaction(async (tx) => {
      // Get the experience first to find which organization it was tied to
      const [experience] = await tx
        .select()
        .from(userExperiences)
        .where(
          and(
            eq(userExperiences.id, experienceId),
            eq(userExperiences.userId, userId),
          ),
        )
        .limit(1);

      if (!experience) return false;

      // Delete associated skills
      if (experience.organizationId) {
        await tx
          .delete(userSkills)
          .where(
            and(
              eq(userSkills.userId, userId),
              eq(userSkills.organizationId, experience.organizationId),
            ),
          );
      }

      // Delete the experience itself
      const result = await tx
        .delete(userExperiences)
        .where(
          and(
            eq(userExperiences.id, experienceId),
            eq(userExperiences.userId, userId),
          ),
        )
        .returning();

      return result.length > 0;
    });
  }
}
