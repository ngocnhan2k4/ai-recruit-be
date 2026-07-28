import { CvLanguageEnum } from "./enum.entity";

export interface OptimizeAtsRequest {
  cvText: string;
  jobDescription?: string;
  language?: CvLanguageEnum;
  /** Language for reasoning/recommendation text; defaults to `language` if omitted. Usually the frontend's current UI language. */
  reasoningLanguage?: CvLanguageEnum;
  /** Cloudinary URL of the originally uploaded CV file, if any. */
  originalCvUrl?: string;
  /** Raw text extracted from the originally uploaded CV file, if any. */
  oldRawText?: string;
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

export class ScoreCriteria {
  score: number;
  feedback: string;
}

export class ScoreBreakdown {
  format: ScoreCriteria;
  skills: ScoreCriteria;
  experience: ScoreCriteria;
  relevance: ScoreCriteria;
}

export class OptimizationApplied {
  section: string;
  action: "update" | "delete" | "add";
  originalText: string | null;
  optimizedText: string | null;
  reasoning: string;
}

export class OptimizeAtsResponseV2 {
  cvData: OptimizedCvData;
  originalAtsScore: number;
  originalScoreBreakdown: ScoreBreakdown;
  atsScore: number;
  scoreBreakdown: ScoreBreakdown;
  matchingSkills: string[];
  missingSkills: string[];
  recommendation: string;
  optimizationsApplied: OptimizationApplied[];
  generatedAt: string;
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
  /** The CV's own content language; suggested text must be written in this language. */
  cvLanguage?: CvLanguageEnum;
  /** Language for the reasoning/explanation text; usually the frontend's current UI language. */
  reasoningLanguage?: CvLanguageEnum;
}

export interface CvFieldSuggestionResponse {
  targetField: string;
  suggestion: string;
  generatedAt: string;
}

export interface SuggestionChunk {
  action: "update" | "add";
  originalText: string | null;
  suggestedText: string;
  reasoning: string;
}

export interface CvFieldSuggestionResponseV2 {
  targetField: string;
  suggestions: SuggestionChunk[];
  generatedAt: string;
}

export interface SuggestionLogEntry extends SuggestionChunk {
  targetField: string;
  decision: "accepted" | "rejected";
  decidedAt: string;
}
