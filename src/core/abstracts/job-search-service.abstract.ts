import { PaginatedResult } from "@/common/types";
import { JobFilters, JobSearchDocument, UserProfile } from "@/core/entities";

export abstract class IJobSearchService {
  abstract searchJobs(
    filters: JobFilters,
  ): Promise<PaginatedResult<JobSearchDocument>>;
  abstract matchJobs(
    userProfile: UserProfile,
    filters: JobFilters,
  ): Promise<PaginatedResult<JobSearchDocument>>;
}
