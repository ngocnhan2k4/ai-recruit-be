export interface CvExtractedData {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  skillIds: string[];
  skillNames: string[];
  provinceIds: string[];
  provinceNames: string[];
  categoryIds: string[];
  categoryNames: string[];
  expectedSalary: number | undefined;
  experienceYears: number | undefined;
  personalInfo: string;
  summary: string;
}

export enum CvEventType {
  UPSERT_CV = "upsert.cv",
  DELETE_CV = "delete.cv",
}
