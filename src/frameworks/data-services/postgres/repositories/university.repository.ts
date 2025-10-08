import { IUniversityRepository, University } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { universities } from "../models";

@Injectable()
export class UniversityRepository
  extends GenericRepository<University, typeof universities>
  implements IUniversityRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, universities);
  }
}
