import { IUserAnswerRepository, UserAnswer } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle, DBDrizzleTransaction } from "../types";
import { userAnswers, questions } from "../models";
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

  async getTestAnswers(
    userTestId: string,
  ): Promise<(UserAnswer & { difficultyLevels?: string[] })[]> {
    const rows = await this.db
      .select({
        id: userAnswers.id,
        userTestId: userAnswers.userTestId,
        questionId: userAnswers.questionId,
        chosenAnswer: userAnswers.chosenAnswer,
        isCorrect: userAnswers.isCorrect,
        pointGained: userAnswers.pointGained,
        createdAt: userAnswers.createdAt,
        difficultyLevels: questions.difficultyLevels,
      })
      .from(userAnswers)
      .leftJoin(questions, eq(userAnswers.questionId, questions.id))
      .where(eq(userAnswers.userTestId, userTestId));

    return rows.map((r) => ({
      ...r,
      difficultyLevels: (r.difficultyLevels as string[] | null) ?? [],
    }));
  }

  async upsertScoredAnswers(
    userTestId: string,
    answers: Array<{
      questionId: string;
      chosenAnswer: string;
      isCorrect: boolean;
      pointGained: number;
    }>,
    tx?: DBDrizzleTransaction,
  ): Promise<void> {
    const dbContext = tx || this.db;

    const existing = await dbContext
      .select()
      .from(userAnswers)
      .where(eq(userAnswers.userTestId, userTestId));

    for (const a of answers) {
      const rowsForQuestion = existing.filter(
        (r) => r.questionId === a.questionId,
      );

      if (rowsForQuestion.length > 0) {
        for (const row of rowsForQuestion) {
          await dbContext
            .update(userAnswers)
            .set({
              chosenAnswer: a.chosenAnswer,
              isCorrect: a.isCorrect,
              pointGained: a.pointGained,
            })
            .where(eq(userAnswers.id, row.id));
        }
      } else {
        await dbContext.insert(userAnswers).values({
          userTestId,
          questionId: a.questionId,
          chosenAnswer: a.chosenAnswer,
          isCorrect: a.isCorrect,
          pointGained: a.pointGained,
        });
      }
    }
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
