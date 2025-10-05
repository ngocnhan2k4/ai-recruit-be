import { IGenericRepository } from "./generic-repository.abstract";
import { Category } from "@/core/entities";

export abstract class ICategoryRepository extends IGenericRepository<Category> {}
