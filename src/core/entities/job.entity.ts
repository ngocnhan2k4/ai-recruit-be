import { TokenPayload } from "@/common/types/token";
import { JobStatusEnum, WorkTypeEnum } from "./enum.entity";
import { GeneralQuery } from "@/common/types/api";
import {
  Category,
  Company,
  Job,
  OrganizationWithDetails,
  Province,
  Skill,
} from ".";

export interface JobFilters extends GeneralQuery {
  organizationId?: OrganizationWithDetails["id"];
  salaryMin?: number;
  salaryMax?: number;
  experienceMin?: number;
  experienceMax?: number;
  provinceId?: Province["id"];
  provinceIds?: Province["id"][];
  companyId?: Company["id"];
  categoryId?: Category["id"];
  workType?: WorkTypeEnum;
  status?: JobStatusEnum;
  user?: TokenPayload;
  createdAtStart?: Date;
  createdAtEnd?: Date;
  isJobSystem?: boolean;
}

export interface StatisticsJobFilter {
  fromDate?: Date;
  toDate?: Date;
  categoryId?: string;
  provinceId: Province["id"];
  isOpen?: boolean;
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
  cvId: string;
  answers?: JobAnswer[];
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
  name: string;
  logoUrl?: string;
  count?: number;
  percentage: number;
}

export enum JobEventType {
  UPSERT = "upsert",
  DELETE = "delete",
}
