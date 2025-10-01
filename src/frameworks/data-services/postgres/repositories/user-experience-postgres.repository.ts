import { IUserExperienceGenericRepository } from "@/core";
import { PostgresGenericRepository } from "./postgres-generic-repository";
import { Inject } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { userExperiences } from "../models";

export class UserExperiencePostgresRepository<TUserExperience, TTable>
  extends PostgresGenericRepository<TUserExperience, TTable>
  implements IUserExperienceGenericRepository<TUserExperience>
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userExperiences as TTable);
  }
}
