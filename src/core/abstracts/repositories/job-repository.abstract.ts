import {
  StatisticsJobFilter,
  JobFilters,
  CursorPaginationResult,
} from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";
import { Job, Province, Company, Skill } from "@/core/entities";
import {
  ApplyJobResponseDto,
  JobAnswerDto,
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
      isApplied?: boolean;
      applyStatus?: string;
      applyId?: string;
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

  abstract applyJob(
    userId: string,
    jobId: string,
    userCvId?: string,
    answers?: JobAnswerDto[],
  ): Promise<ApplyJobResponseDto>;

  abstract updateApplyJob(
    applyId: string,
    userId: string,
    status?: string,
    userCvId?: string,
    answers?: JobAnswerDto[],
  ): Promise<ApplyJobResponseDto | null>;

  abstract getApplyJobById(
    applyId: string,
    userId: string,
  ): Promise<ApplyJobResponseDto | null>;

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

  // CRUD operations
  abstract createJob(job: Partial<Job>): Promise<Job>;
  abstract updateJob(jobId: string, job: Partial<Job>): Promise<Job | null>;
  abstract deleteJob(jobId: string): Promise<boolean>;
  abstract getJobById(jobId: string): Promise<Job | null>;
}
