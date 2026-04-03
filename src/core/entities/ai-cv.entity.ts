import { CvLanguageEnum } from "./enum.entity";

export interface OptimizeAtsRequest {
  cvText: string;
  jobDescription?: string;
  language?: CvLanguageEnum;
}

export class CvSocialLink {
  name?: string | null;
  url?: string | null;
}

export class CvPersonalInfo {
  name: string;
  email: string;
  phone?: string;
  location?: string;
  avatarUrl?: string | null;
  linkedin?: CvSocialLink | null;
  github?: CvSocialLink | null;
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
  shortName?: string | null;
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
  language: CvLanguageEnum;
}

export interface CvFieldContext {
  index?: number;
  position?: string;
  company?: string;
  name?: string;
  description?: string;
  technologies?: string[];
  [key: string]: any;
}

export interface CvFieldSuggestionRequest {
  cvData: OptimizedCvData;
  targetField: string;
  fieldContext?: CvFieldContext | null;
  jobDescription?: string | null;
}

export interface CvFieldSuggestionResponse {
  targetField: string;
  suggestion: string;
  generatedAt: string;
}
