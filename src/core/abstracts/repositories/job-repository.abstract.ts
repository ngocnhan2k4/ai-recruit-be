import { IGenericRepository } from "./generic-repository.abstract";
import {
  Job,
  WorkTypeEnum,
  Notification,
  ApplyStatusEnum,
} from "@/core/entities";
import {
  JobResponse,
  JobFilters,
  StatisticsJobFilter,
  JobAnswer,
  ApplyJobResponse,
  UserInteractionResponse,
  JobCounts,
  TopInMarketResponse,
} from "@/core/entities/job.entity";
import { GeneralQuery } from "@/common/types/api";
import { PaginatedResult } from "@/common/types/api";

export abstract class IJobRepository extends IGenericRepository<Job> {
  abstract getJobs(filters?: JobFilters): Promise<PaginatedResult<JobResponse>>;

  abstract getJobsByAdmin(
    filters?: JobFilters,
  ): Promise<PaginatedResult<JobResponse>>;

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

  abstract getTopAppliedJobs(
    filter: StatisticsJobFilter,
  ): Promise<TopInMarketResponse[]>;

  abstract getTopEmployers(
    filter: StatisticsJobFilter,
  ): Promise<TopInMarketResponse[]>;

  abstract getTopCategories(
    filter: StatisticsJobFilter,
  ): Promise<TopInMarketResponse[]>;

  abstract applyJob(
    jobId: string,
    userCvId: string,
    sendNotifications: boolean,
    senderUserId?: string,
    answers?: JobAnswer[],
  ): Promise<
    | ApplyJobResponse
    | {
        application: ApplyJobResponse;
        notifications: Notification[];
        jobTitle?: string;
      }
  >;

  abstract updateApplyJob(
    applyId: string,
    status: ApplyStatusEnum,
    sendNotifications: boolean,
    senderUserId?: string,
    userCvId?: string,
    answers?: JobAnswer[],
  ): Promise<
    | ApplyJobResponse
    | {
        application: ApplyJobResponse;
        notification: Notification;
        jobTitle: string;
      }
  >;

  abstract getApplyJobById(applyId: string): Promise<ApplyJobResponse | null>;

  abstract saveJob(
    userId: string,
    jobId: string,
    save: boolean,
  ): Promise<UserInteractionResponse | null>;

  abstract hideJob(
    userId: string,
    jobId: string,
    hide: boolean,
  ): Promise<UserInteractionResponse | null>;

  // CRUD operations
  abstract createJob(
    job: Partial<Job> & {
      skillIds?: string[];
      provinceIds?: string[];
    },
    sendNotifications?: boolean,
    senderUserId?: string,
  ): Promise<
    | Job
    | {
        job: Job;
        newNotifications: Notification[];
      }
  >;
  abstract updateJob(
    jobId: string,
    job: Partial<Job> & {
      skillIds?: string[];
      provinceIds?: string[];
    },
  ): Promise<Job | null>;
  abstract updateJobWithNotifications(
    jobId: string,
    job: Partial<Job> & {
      skillIds?: string[];
      provinceIds?: string[];
    },
    userId: string,
  ): Promise<{ job: Job | null; newNotifications: Notification[] }>;
  abstract deleteJob(jobId: string): Promise<boolean>;

  abstract getFullJobById(
    jobId: string,
    userId?: string,
  ): Promise<JobResponse | null>;

  abstract getApplyJobs(jobId: string): Promise<ApplyJobResponse[]>;

  abstract getJobCounts(): Promise<JobCounts>;

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
      provinceNames: string[];
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
      provinceNames: string[];
      isApplied: boolean;
      applyStatus: ApplyStatusEnum;
    }>
  >;

  abstract getUsersWithAppliedJobs(): Promise<
    Array<{
      userId: string;
      email: string;
      name: string;
      appliedJobIds: string[];
      skillIds: string[];
      categoryIds: string[];
    }>
  >;

  abstract findRecommendedJobs(
    userId: string,
    appliedJobIds: string[],
    skillIds: string[],
    categoryIds: string[],
    createdAtStart: Date,
    createdAtEnd: Date,
    isJobSystem: boolean,
    limit?: number,
  ): Promise<JobResponse[]>;

  abstract getJobIdsActive(query: GeneralQuery): Promise<string[]>;
}
