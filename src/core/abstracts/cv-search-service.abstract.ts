import { PaginatedResult } from "@/common/types";
import { CvSearchDocument, CvSearchFilters } from "@/core/entities";

export abstract class ICvSearchService {
  abstract searchCvs(
    filters: CvSearchFilters,
  ): Promise<PaginatedResult<CvSearchDocument>>;
}
