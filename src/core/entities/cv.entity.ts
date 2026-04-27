import { GeneralQuery, RelatedEntity } from "@/common/types";
import { ExperienceLevelEnum } from "./enum.entity";

export interface CvExtractedData
  extends Omit<ExtractCvResponse, "skills" | "provinces" | "categories"> {
  skillIds: string[];
  provinceIds: string[];
  categoryIds: string[];
  skillNames: string[];
  provinceNames: string[];
  categoryNames: string[];
  expectedSalary?: number | null;
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
  email?: string;
  phone?: string;
  skills: RelatedEntity[];
  provinces: RelatedEntity[];
  categories: RelatedEntity[];
  experienceYears?: number | null;
  experienceLevel?: ExperienceLevelEnum | null;
  summary?: string;
}

export interface GetListCvFilter extends GeneralQuery {
  skipCount?: boolean;
}
