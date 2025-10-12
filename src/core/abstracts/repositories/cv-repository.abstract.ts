import { IGenericRepository } from "./generic-repository.abstract";
import { Cv } from "@/core/entities";

export abstract class ICvRepository extends IGenericRepository<Cv> {}
