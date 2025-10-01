import { ICategoryGenericRepository } from "@/core";
import { PostgresGenericRepository } from "./postgres-generic-repository";
import { Inject } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { categories } from "../models";

export class CategoryPostgresRepository<TCategory, TTable>
  extends PostgresGenericRepository<TCategory, TTable>
  implements ICategoryGenericRepository<TCategory>
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, categories as TTable);
  }
}
