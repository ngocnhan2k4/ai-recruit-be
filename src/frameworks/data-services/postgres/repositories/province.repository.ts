import { IProvinceRepository } from "@/core";
import { GenericRepository } from "./generic-repository";
import { type DBDrizzle } from "../types";
import { Inject, Injectable } from "@nestjs/common";
import { provinces } from "../models";
import { Province } from "@/core";

@Injectable()
export class ProvinceRepository
  extends GenericRepository<Province, typeof provinces>
  implements IProvinceRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, provinces);
  }

  async getAllProvinces(): Promise<Province[]> {
    const result = await this.db.select().from(provinces);

    return result;
  }
}
