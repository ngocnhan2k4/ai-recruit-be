import { IGenericRepository } from "./generic-repository.abstract";
import {
  Job,
  WorkTypeEnum,
  Notification,
  ApplyStatusEnum,
  User,
  JobTrends,
  JobTrendsQuery,
} from "@/core/entities";
import {
  JobResponse,
  JobFilters,
  ApplyJobFilters,
  StatisticsJobFilter,
  JobAnswer,
  ApplyJobResponse,
  UserInteractionResponse,
  JobCounts,
  TopInMarketResponse,
} from "@/core";
import { GeneralQuery, PaginatedResult } from "@/common/types";

export abstract class IJobRepository extends IGenericRepository<Job> {
  abstract getJobs(filters?: JobFilters): Promise<PaginatedResult<JobResponse>>;

  abstract getJobsByAdmin(
    filters?: JobFilters,
  ): Promise<PaginatedResult<JobResponse>>;

  abstract getFrequentlyJobs(
    filter: StatisticsJobFilter,
  ): Promise<{ date: string; count: number }[]>;

  abstract count(filter: StatisticsJobFilter): Promise<number>;

  abstract countByCategories(
    categoryIds: string[],
    filter: Omit<StatisticsJobFilter, "categoryId">,
  ): Promise<{ categoryId: string; count: number }[]>;

  abstract avgSalaryByCategories(
    categoryIds: string[],
    filter: Omit<StatisticsJobFilter, "categoryId">,
  ): Promise<{ categoryId: string; avgSalary: number }[]>;

  abstract getSalaryStatisticsByExperience(
    filter: StatisticsJobFilter,
  ): Promise<
    {
      expRange: string;
      avgSalaryMin: number;
      avgSalaryMax: number;
      jobCount: number;
    }[]
  >;

  // --- Batch (multi-category) methods ---

  abstract getFrequentlyJobsByCategories(
    categoryIds: string[],
    filter: Omit<StatisticsJobFilter, "categoryId">,
  ): Promise<
    { categoryId: string; frequentlyJobs: { date: string; count: number }[] }[]
  >;

  abstract getSalaryStatsByCategories(
    categoryIds: string[],
    filter: Omit<StatisticsJobFilter, "categoryId">,
  ): Promise<
    {
      categoryId: string;
      salaryStatistics: {
        expRange: string;
        avgSalaryMin: number;
        avgSalaryMax: number;
        jobCount: number;
      }[];
    }[]
  >;

  abstract getTopAppliedJobsByCategories(
    categoryIds: string[],
    filter: Omit<StatisticsJobFilter, "categoryId">,
    limit?: number,
  ): Promise<{ categoryId: string; topAppliedJobs: TopInMarketResponse[] }[]>;

  abstract getTopEmployersByCategories(
    categoryIds: string[],
    filter: Omit<StatisticsJobFilter, "categoryId">,
    limit?: number,
  ): Promise<{ categoryId: string; topEmployers: TopInMarketResponse[] }[]>;

  // --- Single-category methods ---

  abstract getTopAppliedJobs(
    filter: StatisticsJobFilter,
  ): Promise<TopInMarketResponse[]>;

  abstract getTopEmployers(
    filter: StatisticsJobFilter,
    limit?: number,
  ): Promise<TopInMarketResponse[]>;

  abstract getTopCategories(
    filter: StatisticsJobFilter,
  ): Promise<TopInMarketResponse[]>;

  abstract applyJob({
    jobId,
    userCvId,
    sendNotifications,
    senderUserId,
    answers,
  }: {
    jobId: string;
    userCvId: string;
    sendNotifications: boolean;
    senderUserId: string;
    answers?: JobAnswer[];
  }): Promise<
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

  // [TODO] remove later
  // abstract hideJob(
  //   userId: string,
  //   jobId: string,
  //   hide: boolean,
  // ): Promise<UserInteractionResponse | null>;

  // CRUD operations
  abstract createJob(
    job: Partial<Job> & {
      skillIds?: string[];
      skillNames?: string[];
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
      skillNames?: string[];
      provinceIds?: string[];
    },
    options?: {
      sendNotifications?: boolean;
      senderUserId?: string;
      recipients?: {
        receiverId: string;
      }[];
      senderAvatarUrl?: string;
    },
  ): Promise<{ job: Job | null; newNotifications: Notification[] }>;
  abstract updateJobWithNotifications(
    jobId: string,
    job: Partial<Job> & {
      skillIds?: string[];
      skillNames?: string[];
      provinceIds?: string[];
    },
    userId: string,
    options?: {
      recipients?: {
        receiverId: string;
        organizationId?: string;
      }[];
      senderAvatarUrl?: string;
    },
  ): Promise<{ job: Job | null; newNotifications: Notification[] }>;

  abstract getFullJobById(
    jobId: string,
    userId?: string,
  ): Promise<JobResponse | null>;

  abstract getApplyJobs(
    filters: ApplyJobFilters,
  ): Promise<PaginatedResult<ApplyJobResponse>>;

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
    fromDate: string,
    toDate: string,
    isJobSystem: boolean,
    limit?: number,
  ): Promise<JobResponse[]>;

  abstract getUserJobStatuses(
    userId: User["id"],
    jobIds: Job["id"][],
  ): Promise<
    Map<
      Job["id"],
      {
        isSaved: boolean;
        isApplied: boolean;
        applyStatus: string | null;
        applyId: string | null;
      }
    >
  >;

  abstract getJobTrends(params: JobTrendsQuery): Promise<JobTrends[]>;

  abstract getJobsV2(
    filters?: JobFilters,
  ): Promise<PaginatedResult<JobResponse>>;
}
