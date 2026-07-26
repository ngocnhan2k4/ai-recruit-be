import { PaginatedResult } from "@/common/types";
import { JobFilters, JobSearchDocument, UserProfile } from "@/core/entities";
import { SalaryInsightAggResult } from "@/core/entities/job-salary-insight.entity";

export abstract class IJobSearchService {
  abstract searchJobs(
    filters: JobFilters,
  ): Promise<PaginatedResult<JobSearchDocument>>;
  abstract matchJobs(
    userProfile: UserProfile,
    filters: JobFilters,
  ): Promise<PaginatedResult<JobSearchDocument>>;
  abstract getJobById(jobId: string): Promise<JobSearchDocument | null>;
  abstract searchJobsLegacy(
    filters: JobFilters,
  ): Promise<PaginatedResult<JobSearchDocument>>;
  abstract getSalaryInsight(
    criteria: SalaryInsightCriteria,
  ): Promise<SalaryInsightAggResult>;
}

export interface SalaryInsightCriteria {
  excludeJobId: string;
  categoryId?: string;
  title?: string;
  provinceIds?: string[];
  experienceMin?: number;
  experienceMax?: number;
}
