import {
  StatisticsJobFilter,
  JobFilters,
  CursorPaginationResult,
} from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";
import { Job, Province, Company, Skill } from "@/core/entities";

export abstract class IJobRepository extends IGenericRepository<Job> {
  abstract getAllJobs(
    limit?: number,
    cursor?: string,
    filters?: JobFilters,
  ): Promise<
    CursorPaginationResult<{
      job: Job;
      provinces: Province[];
      company: Company;
      skills: Skill[];
    }>
  >;

  abstract getFrequentlyJobs(
    filter: StatisticsJobFilter,
  ): Promise<{ date: string; count: number }[]>;

  abstract count(filter: StatisticsJobFilter): Promise<number>;

  abstract getSalaryStatisticsByExperience(
    filter: StatisticsJobFilter,
  ): Promise<
    {
      expYear: number;
      avgSalaryMin: number;
      avgSalaryMax: number;
      jobCount: number;
    }[]
  >;
}
