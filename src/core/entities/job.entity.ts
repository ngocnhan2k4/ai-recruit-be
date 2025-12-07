import { TokenPayload } from "@/common/types/token";
import { JobStatusEnum, WorkTypeEnum } from "./enum.entity";
import { GeneralQuery } from "@/common/types/api";
import { Category, Job, OrganizationWithDetails, Province, Skill } from ".";

export interface JobFilters extends GeneralQuery {
  organizationId?: string;
  salaryMin?: number;
  salaryMax?: number;
  experienceMin?: number;
  experienceMax?: number;
  provinceId?: string;
  companyId?: string;
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
  provinceId?: string;
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
