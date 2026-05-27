import { Feature } from "@/core";
import { IGenericRepository } from "./generic-repository.abstract";
import { GeneralQuery, PaginatedResult } from "@/common/types";

export abstract class IFeatureRepository extends IGenericRepository<Feature> {
  abstract getListFeatures(
    query: GeneralQuery,
    requestLanguage?: string,
    fallbackLanguage?: string,
  ): Promise<PaginatedResult<Feature>>;

  abstract getFeatureByIdWithLanguage(
    id: number,
    requestLanguage?: string,
    fallbackLanguage?: string,
  ): Promise<Feature | null>;
}
