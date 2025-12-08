import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { aiCvs } from "@/frameworks/data-services/postgres/models";
import { CvLanguageEnum } from "./enum.entity";

export type NewAiCv = InferInsertModel<typeof aiCvs>;
export type AiCv = InferSelectModel<typeof aiCvs>;

export interface OptimizeAtsRequest {
  cvText: string;
  jobDescription: string;
  language?: CvLanguageEnum;
}

export class CvPersonalInfo {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
}

export class CvExperience {
  company?: string;
  position: string;
  startDate: string;
  endDate: string;
  location?: string;
  achievements: string[];
}

export class CvEducation {
  institution: string;
  degree: string | null;
  field: string | null;
  startDate: string | null;
  endDate: string | null;
  gpa: string | null;
  location: string | null;
}

export class CvProject {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
}

export class CvCertificate {
  name: string;
  issuer: string;
  issueDate: string | null;
  expiryDate: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
}

export class CvSkillGroup {
  category: string;
  items: string[];
}

export class CvSkills {
  technical: CvSkillGroup[];
  soft: string[];
}

export class OptimizedCvData {
  targetJobTitle: string | null;
  personalInfo: CvPersonalInfo;
  summary: string;
  experience: CvExperience[];
  education: CvEducation[];
  skills: CvSkills;
  projects: CvProject[];
  certificates: CvCertificate[];
}

export class OptimizeAtsResponse {
  cvData: OptimizedCvData;
  atsScore: number;
  matchingSkills: string[];
  missingSkills: string[];
  recommendation: string;
  model: string;
  generatedAt: string;
}
