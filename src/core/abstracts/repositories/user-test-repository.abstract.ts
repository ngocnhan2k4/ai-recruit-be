import { UserTest } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

export type UserTestSelectedSkill = { id: string; name: string };

export type UserTestWithSkills = UserTest & {
  selectedSkills: UserTestSelectedSkill[];
};

export abstract class IUserTestRepository extends IGenericRepository<UserTest> {
  abstract getUserTests(userId: string): Promise<UserTest[]>;

  /** Same as getUserTests but joins skills table and attaches selectedSkills (id, name) per test. */
  abstract getUserTestsWithSkills(
    userId: string,
  ): Promise<UserTestWithSkills[]>;

  /** Same as get(id) but with selectedSkills attached (single test, join skills). */
  abstract getWithSkills(testId: string): Promise<UserTestWithSkills | null>;

  abstract updateTestResult(
    testId: string,
    totalScore: number,
    skillLevelsAssessed: Record<string, string>,
    tx?: DBDrizzleTransaction,
  ): Promise<UserTest>;
}
