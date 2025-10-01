import { IUserSkillGenericRepository } from "@/core";
import { PostgresGenericRepository } from "./postgres-generic-repository";
import { Inject } from "@nestjs/common/decorators/core/inject.decorator";
import { type DBDrizzle } from "../types";
import { userSkills } from "../models";

export class UserSkillPostgresRepository<TUserSkill, TTable>
  extends PostgresGenericRepository<TUserSkill, TTable>
  implements IUserSkillGenericRepository<TUserSkill>
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userSkills as TTable);
  }
}
