import { IUserExperienceRepository } from "@/core";
import { PostgresGenericRepository } from "./generic-postgres-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { userExperiences } from "../models";
import { UserExperience } from "@/core/entities";

@Injectable()
export class UserExperiencePostgresRepository
  extends PostgresGenericRepository<UserExperience, typeof userExperiences>
  implements IUserExperienceRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userExperiences);
  }
}
