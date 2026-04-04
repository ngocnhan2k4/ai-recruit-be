import { TokenPayload, GeneralQuery } from "@/common/types";
import { JobStatusEnum, WorkTypeEnum } from "./enum.entity";
import {
  Category,
  Job,
  OrganizationWithDetails,
  Province,
  Skill,
  User,
  Cv,
} from ".";

export interface JobFilters extends GeneralQuery {
  organizationId?: OrganizationWithDetails["id"];
  salaryMin?: number;
  salaryMax?: number;
  experienceMin?: number;
  experienceMax?: number;
  provinceId?: Province["id"];
  // provinceIds?: Province["id"][];
  // companyId?: Company["id"];
  categoryId?: Category["id"];
  categoryIds?: Category["id"][];
  workType?: WorkTypeEnum;
  status?: JobStatusEnum;
  statuses?: JobStatusEnum[];
  user?: TokenPayload;
  createdAtStart?: Date;
  createdAtEnd?: Date;
  fromDate?: string;
  toDate?: string;
  isJobSystem?: boolean;
  skillIds?: string[];

  fields?: string[];
  ids?: string[];
}

export interface ApplyJobFilters extends GeneralQuery {
  jobId: string;
}

export interface StatisticsJobFilter {
  fromDate?: Date;
  toDate?: Date;
  categoryId?: string;
  provinceId?: Province["id"];
  isOpen?: boolean;
  isCategoryNotNull?: boolean;
}

export interface JobResponse {
  job: Job;
  provinces: Province[];
  organization: OrganizationWithDetails;
  skills: Skill[];
  isSaved?: boolean;
  isApplied?: boolean;
  applyStatus?: string;
  applyId?: string;
  applyUrl?: string | null;
  category: Category;
}

// Job Application Related Entities
export interface JobAnswer {
  question: string;
  answer: string;
}

export interface ApplyJobResponse {
  id: string;
  jobId: string;
  status: string;
  answers?: JobAnswer[];
  createdAt?: Date;
  updatedAt?: Date;
  user?: Pick<User, "id" | "email" | "name" | "avatarUrl">;
  cv?: Pick<Cv, "id" | "name" | "fileUrl">;
}

export interface UserInteractionResponse {
  id: string;
  userId: string;
  jobId: string;
  type: string;
}

export interface JobCounts {
  total: number;
  byStatus: {
    status: JobStatusEnum;
    count: number;
  }[];
}

export interface TopInMarketResponse {
  id?: string;
  name: string;
  logoUrl?: string;
  count?: number;
  percentage: number;
}

export enum JobEventType {
  UPSERT_JOB = "upsert.job",
  DELETE_JOB = "delete.job",
  UPDATE_ORG = "update.org",
  DELETE_ORG = "delete.org",
}

export enum JobTrendTypeEnum {
  CREATED = "created",
  CRAWLED = "crawled",
}

export interface JobTrends {
  date: string;
  count: number;
}

export interface JobTrendsQuery {
  fromDate?: string;
  toDate?: string;
  type?: JobTrendTypeEnum;
}
