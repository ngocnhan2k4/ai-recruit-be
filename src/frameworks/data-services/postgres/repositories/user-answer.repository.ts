import { IUserAnswerRepository, UserAnswer } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle, DBDrizzleTransaction } from "../types";
import { userAnswers } from "../models";
import { eq } from "drizzle-orm";

@Injectable()
export class UserAnswerRepository
  extends GenericRepository<UserAnswer, typeof userAnswers>
  implements IUserAnswerRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userAnswers);
  }

  async createMany(
    answerValues: Partial<UserAnswer>[],
    tx?: DBDrizzleTransaction,
  ): Promise<UserAnswer[]> {
    const dbContext = tx || this.db;

    const result = await dbContext
      .insert(userAnswers)
      .values(answerValues as any)
      .returning();

    return result;
  }

  async getTestAnswers(userTestId: string): Promise<UserAnswer[]> {
    return await this.db
      .select()
      .from(userAnswers)
      .where(eq(userAnswers.userTestId, userTestId));
  }

  async upsertAnswers(
    userTestId: string,
    answers: Array<{ questionId: string; chosenAnswer: string }>,
    tx?: DBDrizzleTransaction,
  ): Promise<UserAnswer[]> {
    const dbContext = tx || this.db;

    // Get existing answers for this test
    const existingAnswers = await dbContext
      .select()
      .from(userAnswers)
      .where(eq(userAnswers.userTestId, userTestId));

    const existingMap = new Map(existingAnswers.map((a) => [a.questionId, a]));

    const toInsert: Partial<UserAnswer>[] = [];
    const toUpdate: Array<{ id: string; chosenAnswer: string }> = [];

    for (const answer of answers) {
      const existing = existingMap.get(answer.questionId);
      if (existing) {
        toUpdate.push({
          id: existing.id,
          chosenAnswer: answer.chosenAnswer,
        });
      } else {
        toInsert.push({
          userTestId,
          questionId: answer.questionId,
          chosenAnswer: answer.chosenAnswer,
          isCorrect: false, // Will be calculated on final submission
          pointGained: 0,
        });
      }
    }

    // Insert new answers
    if (toInsert.length > 0) {
      await dbContext.insert(userAnswers).values(toInsert as any);
    }

    // Update existing answers
    for (const update of toUpdate) {
      await dbContext
        .update(userAnswers)
        .set({ chosenAnswer: update.chosenAnswer })
        .where(eq(userAnswers.id, update.id));
    }

    // Return all answers for this test
    return await dbContext
      .select()
      .from(userAnswers)
      .where(eq(userAnswers.userTestId, userTestId));
  }
}
