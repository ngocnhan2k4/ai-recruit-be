import { IGenericRepository } from "./generic-repository.abstract";
import { Category } from "@/core/entities";

//  eslint-disable-next-line @typescript-eslint/no-empty-object-type
export abstract class ICategoryRepository extends IGenericRepository<Category> {}
