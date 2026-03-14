import { IUserTestRepository, UserTest, UserTestSkill } from "@/core";
import { NotFoundException } from "@nestjs/common";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle, DBDrizzleTransaction } from "../types";
import { skills, userTests } from "../models";
import { eq, desc, inArray } from "drizzle-orm";

@Injectable()
export class UserTestRepository
  extends GenericRepository<UserTest, typeof userTests>
  implements IUserTestRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userTests);
  }

  async getUserTests(userId: string): Promise<UserTest[]> {
    const tests = (await this.db
      .select()
      .from(userTests)
      .where(eq(userTests.userId, userId))
      .orderBy(desc(userTests.createdAt))) as UserTest[];
    return this.attachSkillNames(tests);
  }

  async getUserTestWithSkills(testId: string): Promise<UserTest | null> {
    const result = (await this.db
      .select()
      .from(userTests)
      .where(eq(userTests.id, testId))
      .limit(1)) as UserTest[];

    const [test] = await this.attachSkillNames(result);
    return test ?? null;
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

  private async attachSkillNames(tests: UserTest[]): Promise<UserTest[]> {
    if (tests.length === 0) {
      return tests;
    }

    const skillIds = Array.from(
      new Set(tests.flatMap((test) => test.selectedSkillIds ?? [])),
    );

    if (skillIds.length === 0) {
      return tests.map((test) => ({
        ...test,
        selectedSkills: [] as UserTestSkill[],
      }));
    }

    const skillRows = await this.db
      .select({ id: skills.id, name: skills.name })
      .from(skills)
      .where(inArray(skills.id, skillIds));

    const skillMap = new Map<string, string>(
      skillRows.map((row) => [row.id, row.name]),
    );

    return tests.map((test) => ({
      ...test,
      selectedSkills: (test.selectedSkillIds ?? [])
        .map((id) => {
          const name = skillMap.get(id);
          return name ? ({ id, name } as UserTestSkill) : null;
        })
        .filter((skill): skill is UserTestSkill => skill !== null),
    }));
  }
}
