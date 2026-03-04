import { IUserTestRepository, UserTest } from "@/core";
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
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
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
