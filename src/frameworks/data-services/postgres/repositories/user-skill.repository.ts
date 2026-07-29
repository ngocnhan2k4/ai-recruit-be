import { IUserSkillRepository } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { skills, userSkills, userTests } from "../models";
import { UserSkill, UserSkillResponse } from "@/core";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import {
  CACHE_KEYS,
  EXAM_USER_SKILL_MIN_SCORE,
  USER_SKILL_SOURCE_EXAM,
} from "@/common/constants";

@Injectable()
export class UserSkillRepository
  extends GenericRepository<UserSkill, typeof userSkills>
  implements IUserSkillRepository
{
  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(db, userSkills);
  }

  private async invalidateUserProfileCache(userId: string): Promise<void> {
    await this.cacheManager.del(CACHE_KEYS.user.getUserProfile(userId));
  }

  async getUserSkills(userId: string): Promise<UserSkillResponse[]> {
    const rows = await this.db
      .select({
        id: skills.id,
        name: skills.name,
        source: userSkills.source,
        userId: userSkills.userId,
        skillId: userSkills.skillId,
      })
      .from(userSkills)
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(userSkills.userId, userId));

    if (rows.length === 0) return [];

    const examSkillIds = rows
      .filter((row) => row.source === USER_SKILL_SOURCE_EXAM)
      .map((row) => row.skillId);

    const levelBySkillId = new Map<string, string>();

    if (examSkillIds.length > 0) {
      const tests = await this.db
        .select({
          selectedSkillIds: userTests.selectedSkillIds,
          skillLevelsAssessed: userTests.skillLevelsAssessed,
        })
        .from(userTests)
        .where(
          and(
            eq(userTests.userId, userId),
            gte(userTests.totalScore, EXAM_USER_SKILL_MIN_SCORE),
          ),
        )
        .orderBy(desc(userTests.createdAt));

      for (const test of tests) {
        const assessed = test.skillLevelsAssessed ?? {};
        for (const skillId of examSkillIds) {
          if (levelBySkillId.has(skillId)) continue;

          if (assessed[skillId]) {
            levelBySkillId.set(skillId, assessed[skillId]);
            continue;
          }

          if (test.selectedSkillIds?.includes(skillId)) {
            const fallbackLevel = Object.values(assessed)[0];
            if (fallbackLevel) {
              levelBySkillId.set(skillId, fallbackLevel);
            }
          }
        }
      }
    }

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      source: row.source ?? null,
      level:
        row.source === USER_SKILL_SOURCE_EXAM
          ? (levelBySkillId.get(row.skillId) ?? null)
          : null,
    }));
  }

  override async create(
    data: Partial<UserSkill>,
    tx?: any,
  ): Promise<UserSkill> {
    const result = await super.create(data, tx);
    if (data.userId) {
      await this.invalidateUserProfileCache(data.userId);
    }
    return result;
  }

  override async deletePermanently(
    data: Partial<UserSkill>,
  ): Promise<UserSkill[]> {
    const result = await super.deletePermanently(data);
    if (data.userId) {
      await this.invalidateUserProfileCache(data.userId);
    }
    return result;
  }

  async createMany(
    userSkillValues: Array<
      Pick<UserSkill, "userId" | "skillId"> & Partial<UserSkill>
    >,
  ): Promise<UserSkill[]> {
    if (userSkillValues.length === 0) return [];

    const result = await this.db
      .insert(userSkills)
      .values(
        userSkillValues.map((value) => ({
          userId: value.userId,
          skillId: value.skillId,
          organizationId: value.organizationId ?? null,
          source: value.source ?? null,
        })),
      )
      .onConflictDoUpdate({
        target: [userSkills.userId, userSkills.skillId],
        set: {
          source: sql`COALESCE(excluded.source, ${userSkills.source})`,
        },
      })
      .returning();

    if (userSkillValues[0].userId) {
      await this.invalidateUserProfileCache(userSkillValues[0].userId);
    }

    return result;
  }
}
