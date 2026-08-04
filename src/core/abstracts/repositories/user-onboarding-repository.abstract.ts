import { IGenericRepository } from "./generic-repository.abstract";
import { UserOnboarding } from "@/core/entities";
import { User } from "@/core/entities";
export abstract class IUserOnboardingRepository extends IGenericRepository<UserOnboarding> {
  abstract createOnboardingForUser(
    userId: string,
    onboardingData: UserOnboarding,
    userData: Partial<
      Pick<User, "name" | "gender" | "dob" | "onboardingCompleted">
    >,
  ): Promise<void>;

  abstract upsert(
    userId: string,
    onboardingData: Partial<UserOnboarding>,
  ): Promise<void>;
}
