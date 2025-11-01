import { IUserEducationRepository } from "@/core";
import { GenericRepository } from "./generic-repository";
import { UserEducation } from "@/core/entities";
import { userEducations } from "../models";
import { type DBDrizzle } from "../types";
import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class UserEducationRepository
  extends GenericRepository<UserEducation, typeof userEducations>
  implements IUserEducationRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userEducations);
  }
}
