import { IUserSkillRepository } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { userSkills } from "../models";
import { UserSkill } from "@/core";

@Injectable()
export class UserSkillRepository
  extends GenericRepository<UserSkill, typeof userSkills>
  implements IUserSkillRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userSkills);
  }
}
