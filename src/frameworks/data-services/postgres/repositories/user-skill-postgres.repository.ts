import { IUserSkillRepository } from "@/core";
import { PostgresGenericRepository } from "./generic-postgres-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { userSkills } from "../models";
import { UserSkill } from "@/core";

@Injectable()
export class UserSkillPostgresRepository
  extends PostgresGenericRepository<UserSkill, typeof userSkills>
  implements IUserSkillRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userSkills);
  }
}
