import { IGenericRepository } from "./generic-repository.abstract";
import { UserOnboarding } from "@/core/entities";
import { User } from "@/core/entities";
export abstract class IUserOnboardingRepository extends IGenericRepository<UserOnboarding> {
  abstract createOnboardingForUser(
    userId: string,
    onboardingData: UserOnboarding,
    userData: Pick<User, "name" | "gender" | "dob">,
  ): Promise<void>;
}
