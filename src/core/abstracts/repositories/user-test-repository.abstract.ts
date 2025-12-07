import { UserTest } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

export abstract class IUserTestRepository extends IGenericRepository<UserTest> {
  abstract getUserTests(userId: string): Promise<UserTest[]>;

  abstract updateTestResult(
    testId: string,
    totalScore: number,
    skillLevelsAssessed: Record<string, string>,
    tx?: DBDrizzleTransaction,
  ): Promise<UserTest>;
}
