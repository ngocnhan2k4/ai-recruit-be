import { UserSubscription } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { IUserSubscriptionRepository } from "@/core/abstracts/repositories/user-subscription-repository.abstract";
import { userSubscriptions } from "../models";

@Injectable()
export class UserSubscriptionRepository
  extends GenericRepository<UserSubscription, typeof userSubscriptions>
  implements IUserSubscriptionRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userSubscriptions);
  }
}
