import { Inject, Injectable } from "@nestjs/common";
import { aiCvs } from "../models";
import { type DBDrizzle } from "@/frameworks/data-services/postgres/types";
import { GenericRepository } from "./generic-repository";
import { IAiCvRepository } from "@/core/abstracts/repositories/ai-cv-repository.abstract";
import { AiCv } from "@/core";

@Injectable()
export class AiCvRepository
  extends GenericRepository<AiCv, typeof aiCvs>
  implements IAiCvRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, aiCvs);
  }
}
