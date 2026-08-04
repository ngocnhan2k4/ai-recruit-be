import { IOrganizationRepository, IUserExperienceRepository } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { DBDrizzleTransaction, type DBDrizzle } from "../types";
import {
  Skill,
  UserExperience,
  OrganizationTypeEnum,
  OrganizationWithDetails,
  UserStatusEnum,
} from "@/core/entities";
import { skills, userExperiences, users, userSkills } from "../models";
import { and, eq, inArray, sql } from "drizzle-orm";
import { organizations } from "../models/organization.model";
import { CreateUserExperience } from "@/core/entities/user.entity";
import {
  convertDateToStr,
  getFallbackLanguage,
  getRequestLanguage,
  slugify,
} from "@/common/utils";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { CACHE_KEYS, USER_SKILL_SOURCE_EXAM } from "@/common/constants";

@Injectable()
export class UserExperienceRepository
  extends GenericRepository<UserExperience, typeof userExperiences>
  implements IUserExperienceRepository
{
  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    private readonly organizationRepository: IOrganizationRepository,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(db, userExperiences);
  }

  private async invalidateUserProfileCache(userId: string): Promise<void> {
    await this.cacheManager.del(CACHE_KEYS.user.getUserProfile(userId));
  }

  async getUserExperiencesByUsername(username: string): Promise<
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
    const requestLanguage = getRequestLanguage();
    const fallbackLanguage = getFallbackLanguage();
    const getRowsByLanguage = async (languageCode: string) =>
      this.db
        .select({
          experience: userExperiences,
          organization: organizations,
          skill: skills,
        })
        .from(userExperiences)
        .innerJoin(
          users,
          and(
            eq(users.id, userExperiences.userId),
            eq(users.status, UserStatusEnum.ACTIVE),
          ),
        )
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

    let rows = await getRowsByLanguage(requestLanguage);
    if (!rows.length && requestLanguage !== fallbackLanguage) {
      rows = await getRowsByLanguage(fallbackLanguage);
    }

    if (!rows.length) {
      rows = await this.db
        .select({
          experience: userExperiences,
          organization: organizations,
          skill: skills,
        })
        .from(userExperiences)
        .innerJoin(
          users,
          and(
            eq(users.id, userExperiences.userId),
            eq(users.status, UserStatusEnum.ACTIVE),
          ),
        )
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

  /**
   * Sync skills linked to an experience org.
   * - Keep `source=exam` forever (detach org only when removed).
   * - Upsert next skills; never overwrite an existing source.
   */
  private async syncExperienceUserSkills(
    tx: DBDrizzleTransaction,
    userId: string,
    organizationId: string,
    skillIds: string[],
    previousOrganizationId?: string | null,
  ): Promise<void> {
    const nextSkillIds = Array.from(new Set(skillIds.filter(Boolean)));
    const nextSkillIdSet = new Set(nextSkillIds);

    if (previousOrganizationId) {
      const existingOnOrg = await tx
        .select({
          skillId: userSkills.skillId,
          source: userSkills.source,
        })
        .from(userSkills)
        .where(
          and(
            eq(userSkills.userId, userId),
            eq(userSkills.organizationId, previousOrganizationId),
          ),
        );

      const removed = existingOnOrg.filter(
        (row) => !nextSkillIdSet.has(row.skillId),
      );
      const removedExamIds = removed
        .filter((row) => row.source === USER_SKILL_SOURCE_EXAM)
        .map((row) => row.skillId);
      const removedPlainIds = removed
        .filter((row) => row.source !== USER_SKILL_SOURCE_EXAM)
        .map((row) => row.skillId);

      if (removedExamIds.length > 0) {
        await tx
          .update(userSkills)
          .set({ organizationId: null })
          .where(
            and(
              eq(userSkills.userId, userId),
              eq(userSkills.organizationId, previousOrganizationId),
              inArray(userSkills.skillId, removedExamIds),
            ),
          );
      }

      if (removedPlainIds.length > 0) {
        await tx
          .delete(userSkills)
          .where(
            and(
              eq(userSkills.userId, userId),
              eq(userSkills.organizationId, previousOrganizationId),
              inArray(userSkills.skillId, removedPlainIds),
            ),
          );
      }
    }

    if (nextSkillIds.length === 0) return;

    await tx
      .insert(userSkills)
      .values(
        nextSkillIds.map((skillId) => ({
          userId,
          skillId,
          organizationId,
          source: null,
        })),
      )
      .onConflictDoUpdate({
        target: [userSkills.userId, userSkills.skillId],
        set: {
          organizationId,
          source: sql`COALESCE(${userSkills.source}, excluded.source)`,
        },
      });
  }

  private async preCreateBeforeCreateUserExperience(
    tx: DBDrizzleTransaction,
    userId: string,
    data: CreateUserExperience,
    previousOrganizationId?: string | null,
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

    if (organizationId) {
      await this.syncExperienceUserSkills(
        tx,
        userId,
        organizationId,
        skillIds,
        previousOrganizationId,
      );
    }

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

    await this.invalidateUserProfileCache(userId);
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
      const { organizationId } = await this.preCreateBeforeCreateUserExperience(
        tx,
        userId,
        data,
        userExperience.organizationId,
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

    await this.invalidateUserProfileCache(userId);
    return tx;
  }

  async deleteUserExperienceAndUserSkills(
    userId: string,
    experienceId: number,
  ): Promise<boolean> {
    const deleted = await this.db.transaction(async (tx) => {
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

      // Unlink skills from this experience without wiping exam verification.
      if (experience.organizationId) {
        await this.syncExperienceUserSkills(
          tx,
          userId,
          experience.organizationId,
          [],
          experience.organizationId,
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

    await this.invalidateUserProfileCache(userId);
    return deleted;
  }
}
