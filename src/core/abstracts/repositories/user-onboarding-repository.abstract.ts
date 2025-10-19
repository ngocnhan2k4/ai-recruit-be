import { IGenericRepository } from "./generic-repository.abstract";
import { UserOnboarding } from "@/core/entities";

export abstract class IUserOnboardingRepository extends IGenericRepository<UserOnboarding> {}
