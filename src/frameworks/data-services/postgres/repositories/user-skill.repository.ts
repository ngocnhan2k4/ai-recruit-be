import { IUserSkillRepository, Skill } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { skills, users, userSkills } from "../models";
import { UserSkill } from "@/core";
import { eq } from "drizzle-orm";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { CACHE_KEYS } from "@/common/constants";

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

  async getUserSkills(username: string): Promise<Skill[]> {
    const result = await this.db
      .select({ id: skills.id, name: skills.name })
      .from(users)
      .innerJoin(userSkills, eq(users.id, userSkills.userId))
      .innerJoin(skills, eq(userSkills.skillId, skills.id))
      .where(eq(users.username, username));

    return result as Skill[];
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

  async createMany(userSkillValues: UserSkill[]): Promise<UserSkill[]> {
    const result = await this.db
      .insert(userSkills)
      .values(userSkillValues)
      .onConflictDoNothing({
        target: [userSkills.userId, userSkills.skillId],
      })
      .returning();

    if (userSkillValues.length > 0 && userSkillValues[0].userId) {
      await this.invalidateUserProfileCache(userSkillValues[0].userId);
    }

    return result;
  }
}
