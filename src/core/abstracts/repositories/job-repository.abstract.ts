import {
  StatisticsJobFilter,
  JobFilters,
  CursorPaginationResult,
} from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";
import { Job, Province, Company, Skill } from "@/core/entities";
import {
  ApplyJobResponseDto,
  UserInteractionResponseDto,
} from "@/interfaces/dtos";

export abstract class IJobRepository extends IGenericRepository<Job> {
  abstract getAllJobs(
    limit?: number,
    cursor?: string,
    filters?: JobFilters & { userId?: string },
  ): Promise<
    CursorPaginationResult<{
      job: Job;
      provinces: Province[];
      company: Company;
      skills: Skill[];
      isSaved?: boolean;
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

  abstract applyJob(userId: string): Promise<ApplyJobResponseDto>;

  abstract saveJob(
    userId: string,
    jobId: string,
    save: boolean,
  ): Promise<UserInteractionResponseDto | null>;

  abstract hideJob(
    userId: string,
    jobId: string,
    hide: boolean,
  ): Promise<UserInteractionResponseDto | null>;
}
