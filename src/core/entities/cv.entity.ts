import { GeneralQuery, RelatedEntity } from "@/common/types";
import { ExperienceLevelEnum } from "./enum.entity";

export interface CvExtractedData {
  skillIds: string[];
  provinceIds: string[];
  categoryIds: string[];
  skillNames: string[];
  provinceNames: string[];
  categoryNames: string[];
  experienceYears?: number | null;
  experienceLevel?: ExperienceLevelEnum | null;
}

export enum CvEventType {
  UPSERT_CV = "upsert.cv",
  DELETE_CV = "delete.cv",
}

export interface ExtractCvRequest {
  url: string;
}

export interface ExtractCvResponse {
  // name: string;
  // email?: string;
  // phone?: string;
  skills: RelatedEntity[] | null;
  location: RelatedEntity | null;
  category: RelatedEntity | null;
  experienceYears?: number | null;
  experienceLevel?: ExperienceLevelEnum | null;
  // summary?: string;
}

export interface GetListCvFilter extends GeneralQuery {
  skipCount?: boolean;
}

export interface CvSearchFilters extends GeneralQuery {
  userIds: string[];
  skillIds?: string[];
  provinceIds?: string[];
  categoryId?: string | null;
  experienceMin?: number | null;
  experienceMax?: number | null;
  salaryMin?: string | number | null;
  salaryMax?: string | number | null;
}

export interface CvSearchDocument {
  id: string;
  userId: string;
  name?: string;
  fileUrl?: string;
  mimeType?: string;
  skillIds?: string[];
  skillNames?: string[];
  provinceIds?: string[];
  provinceNames?: string[];
  categoryIds?: string[];
  categoryNames?: string[];
  experienceYears?: number;
  updatedAt?: string;
  score?: number;
}
