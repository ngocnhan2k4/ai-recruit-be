import { IUserExperienceRepository } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { userExperiences } from "../models";
import { UserExperience } from "@/core/entities";

@Injectable()
export class UserExperienceRepository
  extends GenericRepository<UserExperience, typeof userExperiences>
  implements IUserExperienceRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userExperiences);
  }
}
