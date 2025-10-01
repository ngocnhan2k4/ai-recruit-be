import { IProvinceGenericRepository } from "@/core";
import { PostgresGenericRepository } from "./postgres-generic-repository";
import { type DBDrizzle } from "../types";
import { Inject } from "@nestjs/common/decorators/core/inject.decorator";
import { provinces } from "../schema";

export class ProvincePostgresGenericRepository<TProvince, TTable>
  extends PostgresGenericRepository<TProvince, TTable>
  implements IProvinceGenericRepository<TProvince>
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, provinces as TTable);
  }
}
