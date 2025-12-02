import { IUserTestRepository, UserTest } from "@/core";
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
    return await this.db
      .select()
      .from(userTests)
      .where(eq(userTests.userId, userId))
      .orderBy(desc(userTests.createdAt));
  }

  async updateTestResult(
    testId: string,
    totalScore: number,
    levelAssessed: string,
    tx?: DBDrizzleTransaction,
  ): Promise<UserTest> {
    const dbContext = tx || this.db;

    const result = await dbContext
      .update(userTests)
      .set({ totalScore, levelAssessed })
      .where(eq(userTests.id, testId))
      .returning();

    return result[0];
  }
}
