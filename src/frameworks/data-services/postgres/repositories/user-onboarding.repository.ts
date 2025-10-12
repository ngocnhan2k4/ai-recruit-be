import { IUserOnboardingRepository } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { userOnboardings } from "../models";
import { UserOnboarding } from "@/core/entities";

@Injectable()
export class UserOnboardingRepository
  extends GenericRepository<UserOnboarding, typeof userOnboardings>
  implements IUserOnboardingRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userOnboardings);
  }
}
