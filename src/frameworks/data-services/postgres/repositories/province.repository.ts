import { IProvinceRepository } from "@/core";
import { GenericRepository } from "./generic-repository";
import { type DBDrizzle } from "../types";
import { Inject, Injectable } from "@nestjs/common";
import { provinces } from "../schema";
import { Province } from "@/core";

@Injectable()
export class ProvinceRepository
  extends GenericRepository<Province, typeof provinces>
  implements IProvinceRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, provinces);
  }
}
