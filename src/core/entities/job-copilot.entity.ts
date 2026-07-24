export type JobCopilotMode = "generate" | "review";
export type JobCopilotLocale = "vi" | "en";
export type JobQualityLabel = "needs_work" | "fair" | "good" | "excellent";
export type JobQualityCriterionKey =
  | "clarity"
  | "attractiveness"
  | "inclusiveness"
  | "completeness"
  | "consistency";
export type JobSuggestionTarget = "description" | "requirements" | "benefits";
export type JobSuggestionSeverity = "low" | "medium" | "high";
export type ScreeningQuestionType =
  | "knockout"
  | "skill"
  | "culture"
  | "logistics";

export interface JobCopilotDraft {
  title: string;
  category: string;
  experienceMin?: number;
  experienceMax?: number;
  workType: string;
  locations: string[];
  skills: string[];
  salaryMin?: number;
  salaryMax?: number;
  description?: string;
  requirements?: string;
  benefits?: string;
}

export interface JobCopilotRequest {
  mode: JobCopilotMode;
  locale: JobCopilotLocale;
  draft: JobCopilotDraft;
}

export interface JobCopilotGeneratedDraft {
  description: string;
  requirements: string;
  benefits: string;
}

export interface JobQualityCriterion {
  key: JobQualityCriterionKey;
  score: number;
  maxScore: number;
  explanation: string;
  issues: string[];
}

export interface JobQuality {
  totalScore: number;
  label: JobQualityLabel;
  criteria: JobQualityCriterion[];
}

export interface JobSuggestion {
  id: string;
  category: string;
  targetField: JobSuggestionTarget;
  currentText: string;
  replacementText: string;
  reason: string;
  severity: JobSuggestionSeverity;
  estimatedScoreGain: number;
}

export interface ScreeningQuestion {
  id: string;
  type: ScreeningQuestionType;
  text: string;
  enabled: boolean;
}

export interface JobCopilotResponse {
  analysisId: string;
  draft: JobCopilotGeneratedDraft;
  quality: JobQuality;
  suggestions: JobSuggestion[];
  screeningQuestions: ScreeningQuestion[];
}
