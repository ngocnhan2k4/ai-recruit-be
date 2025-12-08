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
}
