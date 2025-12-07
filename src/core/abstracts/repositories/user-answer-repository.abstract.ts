import { UserAnswer } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

export abstract class IUserAnswerRepository extends IGenericRepository<UserAnswer> {
  abstract createMany(
    answers: Partial<UserAnswer>[],
    tx?: DBDrizzleTransaction,
  ): Promise<UserAnswer[]>;

  abstract getTestAnswers(userTestId: string): Promise<UserAnswer[]>;
}
