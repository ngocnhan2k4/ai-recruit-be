import { IGenericRepository } from "./generic-repository.abstract";
import {
  Job,
  Province,
  Company,
  Skill,
  OrganizationWithDetails,
  WorkTypeEnum,
  ApplyStatusEnum,
  JobStatusEnum,
} from "@/core/entities";
import {
  ApplyJobResponseDto,
  JobAnswerDto,
  JobCountsDto,
  UserInteractionResponseDto,
} from "@/interfaces/dtos";
import { GeneralQuery } from "@/common/types/api";
import { PaginatedResult } from "@/common/types/api";
import { TokenPayload } from "@/common/types/token";
import { PaginationType } from "@/interfaces/dtos/common/query";

export interface RangeFilter {
  min?: number;
  max?: number;
}

export interface JobFilters {
  keyword?: string;
  salaryRange?: RangeFilter;
  experienceRange?: RangeFilter;
  provinceId?: string;
  organizationId?: string;
  workType?: WorkTypeEnum;
  status?: JobStatusEnum;
  pagination?: PaginationType;
}

export interface StatisticsJobFilter {
  fromDate?: Date;
  toDate?: Date;
  categoryId?: string;
  provinceId?: string;
  isOpen?: boolean;
}

export abstract class IJobRepository extends IGenericRepository<Job> {
  abstract getAllJobs(
    limit?: number,
    page?: number,
    cursor?: string,
    filters?: JobFilters & { user?: TokenPayload },
  ): Promise<
    PaginatedResult<{
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

  abstract getFullJobById(
    jobId: string,
    userId?: string,
  ): Promise<{
    job: Job;
    provinces: Province[];
    company: OrganizationWithDetails;
    skills: Skill[];
    isSaved?: boolean;
    isApplied?: boolean;
    applyStatus?: string;
    applyId?: string;
  } | null>;

  abstract getApplyJobs(jobId: string): Promise<ApplyJobResponseDto[]>;

  abstract getJobCounts(): Promise<JobCountsDto>;

  abstract getAllSavedJobs(
    userId: string,
    params: GeneralQuery,
  ): Promise<
    PaginatedResult<{
      id: string;
      title: string;
      salaryMin: string | null;
      salaryMax: string | null;
      companyName: string;
      logoUrl: string | null;
      workType: WorkTypeEnum;
      createdAt: Date;
      endedAt: string | null;
      provinceName: string;
      isApplied: boolean;
    }>
  >;
  abstract getNumberOfSavedJobs(userId: string): Promise<number>;
  abstract getNumberOfAppliedJobs(userId: string): Promise<number>;
  abstract getAllAppliedJobs(
    userId: string,
    params: GeneralQuery,
  ): Promise<
    PaginatedResult<{
      id: string;
      title: string;
      salaryMin: string | null;
      salaryMax: string | null;
      companyName: string;
      logoUrl: string | null;
      workType: WorkTypeEnum;
      createdAt: Date;
      endedAt: string | null;
      provinceName: string;
      isApplied: boolean;
      applyStatus: ApplyStatusEnum;
    }>
  >;
}
