import {
  IUserTestRepository,
  ISkillRepository,
  UserTest,
  UserTestWithSkills,
  UserTestSelectedSkill,
} from "@/core";
import { NotFoundException } from "@nestjs/common";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle, DBDrizzleTransaction } from "../types";
import { userTests } from "../models";
import { eq, desc } from "drizzle-orm";

@Injectable()
export class UserTestRepository
  extends GenericRepository<UserTest, typeof userTests>
  implements IUserTestRepository
{
  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    @Inject(ISkillRepository) private readonly skillRepo: ISkillRepository,
  ) {
    super(db, userTests);
  }

  async getUserTests(userId: string): Promise<UserTest[]> {
    const result = await this.db
      .select()
      .from(userTests)
      .where(eq(userTests.userId, userId))
      .orderBy(desc(userTests.createdAt));

    return result as unknown as UserTest[];
  }

  async getUserTestsWithSkills(userId: string): Promise<UserTestWithSkills[]> {
    const tests = await this.getUserTests(userId);
    const allSkillIds = [
      ...new Set(tests.flatMap((t) => t.selectedSkillIds ?? [])),
    ];
    const skillRows = await this.skillRepo.getByIds(allSkillIds);
    const skillsById = new Map(
      skillRows.map((s) => [
        s.id,
        { id: s.id, name: s.name } as UserTestSelectedSkill,
      ]),
    );
    return tests.map((test) => ({
      ...test,
      selectedSkills: (test.selectedSkillIds ?? [])
        .map((id) => skillsById.get(id))
        .filter((s): s is UserTestSelectedSkill => s != null),
    }));
  }

  async getWithSkills(testId: string): Promise<UserTestWithSkills | null> {
    const test = await this.get(testId);
    if (!test) return null;
    const ids = test.selectedSkillIds ?? [];
    if (ids.length === 0) {
      return { ...test, selectedSkills: [] };
    }
    const skillRows = await this.skillRepo.getByIds(ids);
    const skillsById = new Map(
      skillRows.map((s) => [
        s.id,
        { id: s.id, name: s.name } as UserTestSelectedSkill,
      ]),
    );
    const selectedSkills = ids
      .map((id) => skillsById.get(id))
      .filter((s): s is UserTestSelectedSkill => s != null);
    return { ...test, selectedSkills };
  }

  async updateTestResult(
    testId: string,
    totalScore: number,
    skillLevelsAssessed: Record<string, string>,
    tx?: DBDrizzleTransaction,
  ): Promise<UserTest> {
    const dbContext = tx || this.db;

    const result = await dbContext
      .update(userTests)
      .set({ totalScore, skillLevelsAssessed })
      .where(eq(userTests.id, testId))
      .returning();

    const updated = result[0] as unknown as UserTest | undefined;
    if (!updated) {
      throw new NotFoundException(`UserTest not found: ${testId}`);
    }

    return updated;
  }
}
