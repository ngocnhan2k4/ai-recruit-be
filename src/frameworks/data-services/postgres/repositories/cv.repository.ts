import { Inject, Injectable } from "@nestjs/common";
import { eq, and, isNull, desc } from "drizzle-orm";
import { cvs } from "../models";
import { type DBDrizzle } from "@/frameworks/data-services/postgres/types";
import { GenericRepository } from "./generic-repository";
import { ICvRepository, Cv } from "@/core";

@Injectable()
export class CvRepository
  extends GenericRepository<Cv, typeof cvs>
  implements ICvRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, cvs);
  }
}
