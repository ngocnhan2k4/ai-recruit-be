import { UserAnswer } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

export abstract class IUserAnswerRepository extends IGenericRepository<UserAnswer> {
  abstract createMany(
    answers: Partial<UserAnswer>[],
    tx?: DBDrizzleTransaction,
  ): Promise<UserAnswer[]>;

  abstract getTestAnswers(userTestId: string): Promise<UserAnswer[]>;

  abstract upsertAnswers(
    userTestId: string,
    answers: Array<{
      questionId: string;
      chosenAnswer: string;
    }>,
    tx?: DBDrizzleTransaction,
  ): Promise<UserAnswer[]>;

  /**
   * Final submit: update rows from partial save or insert if missing.
   * If legacy duplicate rows exist per questionId, all are updated to the same scored values.
   */
  abstract upsertScoredAnswers(
    userTestId: string,
    answers: Array<{
      questionId: string;
      chosenAnswer: string;
      isCorrect: boolean;
      pointGained: number;
    }>,
    tx?: DBDrizzleTransaction,
  ): Promise<void>;
}
