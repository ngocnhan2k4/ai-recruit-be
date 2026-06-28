import { IGenericRepository } from "./generic-repository.abstract";
import { Cv, GetListCvFilter } from "@/core/entities";
import { PaginatedResult } from "@/common/types";

export abstract class ICvRepository extends IGenericRepository<Cv> {
  abstract getCvs(filter: GetListCvFilter): Promise<PaginatedResult<Cv>>;

  abstract count(): Promise<number>;
}
