import { Feature } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { GeneralQuery, PaginatedResult } from "@/common/types";

export abstract class IFeatureRepository extends IGenericRepository<Feature> {
  abstract getListFeatures(
    query: GeneralQuery,
  ): Promise<PaginatedResult<Feature>>;

  abstract getFeatureById(id: number): Promise<Feature | null>;
}
