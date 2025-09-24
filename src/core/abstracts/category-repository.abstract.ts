import { PostgresGenericRepository } from "@/frameworks/data-services/postgres/postgres-generic-repository";
import { categories } from "@/frameworks/data-services/postgres/model";
import { Category } from "../entities/category.entity";

export abstract class PostgresCategoryRepository extends PostgresGenericRepository<
  Category,
  typeof categories
> {
  abstract getCategories(): Promise<Category[]>;
}
