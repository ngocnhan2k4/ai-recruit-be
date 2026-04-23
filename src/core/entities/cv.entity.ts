import { GeneralQuery, RelatedEntity } from "@/common/types";
import { ExperienceLevelEnum } from "./enum.entity";

export interface CvExtractedData extends ExtractCvResponse {
  skillIds: string[];
  provinceIds: string[];
  categoryIds: string[];
  skillNames: string[];
  provinceNames: string[];
  categoryNames: string[];
}

export enum CvEventType {
  UPSERT_CV = "upsert.cv",
  DELETE_CV = "delete.cv",
}

export interface ExtractCvRequest {
  url: string;
}

export interface ExtractCvResponse {
  name: string;
  email: string;
  phone: string;
  skills: RelatedEntity[];
  provinces: RelatedEntity[];
  categories: RelatedEntity[];
  expectedSalary?: number | null;
  experienceYears?: number | null;
  experienceLevel?: ExperienceLevelEnum | null;
  summary: string;
}

export interface GetListCvFilter extends GeneralQuery {
  skipCount?: boolean;
}
