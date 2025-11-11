import { IUserOnboardingRepository, IUserRepository } from "@/core";
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
  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    private readonly userRepository: IUserRepository,
  ) {
    super(db, userOnboardings);
  }
  async createOnboardingForUser(
    userId: string,
    onboardingData: UserOnboarding,
    userData: Pick<User, "name" | "gender" | "dob">,
  ): Promise<void> {
    try {
      await this.db.transaction(async (tx) => {
        const insertPromise = tx.insert(userOnboardings).values(onboardingData);

        const updatePromise = tx
          .update(users)
          .set({
            name: userData.name,
            gender: userData.gender,
            dob: userData.dob,
          })
          .where(eq(users.id, userId));

        await Promise.all([insertPromise, updatePromise]);
      });
    } catch (error) {
      throw new Error(
        "[Onboarding]Transaction failed: " + (error as Error).message,
      );
    }
  }
}
