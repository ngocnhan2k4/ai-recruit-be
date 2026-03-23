import { UpdateUserSubscriptionInput, UserSubscription } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class IUserSubscriptionRepository extends IGenericRepository<UserSubscription> {
  abstract updateUserSubscription(
    id: string,
    data: UpdateUserSubscriptionInput,
  ): Promise<UserSubscription | null>;
}
