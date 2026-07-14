import { IUserOnboardingRepository } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { userOnboardings, users } from "../models";
import { UserOnboarding, User } from "@/core/entities";
import { eq } from "drizzle-orm";

@Injectable()
export class UserOnboardingRepository
  extends GenericRepository<UserOnboarding, typeof userOnboardings>
  implements IUserOnboardingRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userOnboardings);
  }
  async createOnboardingForUser(
    userId: string,
    onboardingData: UserOnboarding,
    userData: Partial<Pick<User, "name" | "gender" | "dob">>,
  ): Promise<void> {
    await this.db.transaction(async (tx) => {
      const { userId: _userId, ...onboardingUpdate } = onboardingData;

      await tx
        .insert(userOnboardings)
        .values(onboardingData)
        .onConflictDoUpdate({
          target: [userOnboardings.userId],
          set: onboardingUpdate,
        });

      const userUpdate: Partial<Pick<User, "name" | "gender" | "dob">> = {};
      if (userData.name !== undefined) userUpdate.name = userData.name;
      if (userData.gender !== undefined) userUpdate.gender = userData.gender;
      if (userData.dob !== undefined) userUpdate.dob = userData.dob;

      if (Object.keys(userUpdate).length > 0) {
        await tx.update(users).set(userUpdate).where(eq(users.id, userId));
      }
    });
  }

  async upsert(
    userId: string,
    onboardingData: Partial<UserOnboarding>,
  ): Promise<void> {
    await this.db
      .insert(userOnboardings)
      .values({
        userId,
        ...onboardingData,
      })
      .onConflictDoUpdate({
        target: [userOnboardings.userId],
        set: onboardingData,
      });
  }
}
