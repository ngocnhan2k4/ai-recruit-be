import { Area } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { GeneralQuery, PaginatedResult } from "@/common/types";

export abstract class IAreaRepository extends IGenericRepository<Area> {
  abstract getPaginatedAreas(
    query: GeneralQuery,
  ): Promise<PaginatedResult<Area>>;
}
