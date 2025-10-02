import { IProvinceRepository } from "@/core";
import { PostgresGenericRepository } from "./generic-postgres-repository";
import { type DBDrizzle } from "../types";
import { Inject, Injectable } from "@nestjs/common";
import { provinces } from "../schema";
import { Province } from "@/core";

@Injectable()
export class ProvincePostgresRepository
  extends PostgresGenericRepository<Province, typeof provinces>
  implements IProvinceRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, provinces);
  }
}
