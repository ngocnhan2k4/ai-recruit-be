import { TokenPayload } from "@/common/types/token";
import { JobStatusEnum, WorkTypeEnum } from "./enum.entity";
import { GeneralQuery } from "@/common/types/api";
import { Job, OrganizationWithDetails, Province, Skill } from ".";

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
  count?: number;
  percentage: number;
}
