import { IUserAnswerRepository, UserAnswer } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle, DBDrizzleTransaction } from "../types";
import { userAnswers, questions } from "../models";
import { eq, sql } from "drizzle-orm";

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

    // Last write wins if the same question appears more than once in one batch
    const byQuestionId = new Map<string, (typeof answers)[number]>();
    for (const a of answers) {
      byQuestionId.set(a.questionId, a);
    }

    const rows = [...byQuestionId.values()].map((a) => ({
      userTestId,
      questionId: a.questionId,
      chosenAnswer: a.chosenAnswer,
      isCorrect: a.isCorrect,
      pointGained: a.pointGained,
    }));

    if (rows.length === 0) {
      return;
    }

    await dbContext
      .insert(userAnswers)
      .values(rows)
      .onConflictDoUpdate({
        target: [userAnswers.userTestId, userAnswers.questionId],
        set: {
          chosenAnswer: sql`excluded.chosen_answer`,
          isCorrect: sql`excluded.is_correct`,
          pointGained: sql`excluded.point_gained`,
        },
      });
  }

  async upsertAnswers(
    userTestId: string,
    answers: Array<{
      questionId: string;
      chosenAnswer: string;
    }>,
    tx?: DBDrizzleTransaction,
  ): Promise<UserAnswer[]> {
    if (tx) {
      return tx.transaction(async (tx) =>
        this._upsertAnswers(tx, {
          userTestId,
          answers,
        }),
      );
    }
    return this._upsertAnswers(this.db, { userTestId, answers });
  }

  private async _upsertAnswers(
    ctx: DBDrizzle | DBDrizzleTransaction,
    data: {
      userTestId: string;
      answers: Array<{
        questionId: string;
        chosenAnswer: string;
      }>;
    },
  ) {
    // Get existing answers for this test
    const existingAnswers = await ctx
      .select()
      .from(userAnswers)
      .where(eq(userAnswers.userTestId, data.userTestId));

    const existingMap = new Map(existingAnswers.map((a) => [a.questionId, a]));

    const toInsert: Partial<UserAnswer>[] = [];
    const toUpdate: Array<{
      id: string;
      questionId: string;
      chosenAnswer: string;
    }> = [];

    for (const answer of data.answers) {
      const existing = existingMap.get(answer.questionId);
      if (existing) {
        toUpdate.push({
          id: existing.id,
          questionId: answer.questionId,
          chosenAnswer: answer.chosenAnswer,
        });
      } else {
        toInsert.push({
          userTestId: data.userTestId,
          questionId: answer.questionId,
          chosenAnswer: answer.chosenAnswer,
          isCorrect: false, // Will be calculated on final submission
          pointGained: 0,
        });
      }
    }

    // Insert new answers
    if (toInsert.length > 0) {
      await ctx.insert(userAnswers).values(toInsert as any);
    }

    // Update existing answers
    for (const update of toUpdate) {
      await ctx
        .update(userAnswers)
        .set({
          chosenAnswer: update.chosenAnswer,
        })
        .where(eq(userAnswers.id, update.id));
    }

    // Return all answers for this test
    return ctx
      .select()
      .from(userAnswers)
      .where(eq(userAnswers.userTestId, data.userTestId));
  }
}
