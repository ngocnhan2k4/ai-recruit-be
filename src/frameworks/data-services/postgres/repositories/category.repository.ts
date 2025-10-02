import { Category, ICategoryRepository } from "@/core";
import { GenericRepository } from "./generic-repository";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "../types";
import { categories } from "../models";

@Injectable()
export class CategoryRepository
  extends GenericRepository<Category, typeof categories>
  implements ICategoryRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, categories);
  }
}
