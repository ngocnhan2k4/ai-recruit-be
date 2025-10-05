import { Inject, Injectable } from "@nestjs/common";
import { GenericRepository } from "./generic-repository";
import { ICompanyRepository } from "@/core";
import { companies } from "../models";
import { type DBDrizzle } from "@/frameworks/data-services/postgres/types";
import { Company } from "@/core/entities";

@Injectable()
export class CompanyRepository
  extends GenericRepository<Company, typeof companies>
  implements ICompanyRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, companies);
  }

  async getAllSimple(): Promise<{ id: string; name: string }[]> {
    const result = await this.db
      .select({
        id: companies.id,
        name: companies.name,
      })
      .from(companies);

    return result;
  }
}
