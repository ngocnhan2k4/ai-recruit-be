import { Category, ICategoryRepository } from "@/core";
import { PostgresGenericRepository } from "./generic-postgres-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { categories } from "../models";

@Injectable()
export class CategoryPostgresRepository
  extends PostgresGenericRepository<Category, typeof categories>
  implements ICategoryRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, categories);
  }
}
