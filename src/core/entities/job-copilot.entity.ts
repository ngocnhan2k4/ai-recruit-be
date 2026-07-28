export type JobCopilotMode = "generate" | "review" | "revise";
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
export type JobSuggestionType = "missing_input" | "content_improvement";
export type JobSuggestionResolutionKind =
  | "salary"
  | "title_category_conflict"
  | "role_skills_conflict"
  | "free_text";
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
  salaryCurrency: "VND";
  salaryUnit: "million";
  description?: string;
  requirements?: string;
  benefits?: string;
}

export interface JobCopilotRequest {
  mode: JobCopilotMode;
  locale: JobCopilotLocale;
  draft: JobCopilotDraft;
  localizedDrafts?: Record<JobCopilotLocale, JobCopilotGeneratedDraft>;
  instruction?: string;
  scoreContext?: JobCopilotScoreContext;
}

export interface JobCopilotBaselineCriterion {
  key: JobQualityCriterionKey;
  score: number;
  maxScore: number;
}

export interface JobCopilotAppliedSuggestion {
  id: string;
  criterionKey: JobQualityCriterionKey;
  scoreGain: number;
}

export interface JobCopilotScoreContext {
  baselineCriteria: JobCopilotBaselineCriterion[];
  appliedSuggestions: JobCopilotAppliedSuggestion[];
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
  type: JobSuggestionType;
  resolutionKind: JobSuggestionResolutionKind;
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

export interface JobCopilotSuggestedSkill {
  id: string;
  name: string;
}

export interface JobCopilotLocalizedWorkspace {
  draft: JobCopilotGeneratedDraft;
  quality: JobQuality;
  suggestions: JobSuggestion[];
  screeningQuestions: ScreeningQuestion[];
}

export type JobCopilotLocalizedWorkspaces = Record<
  JobCopilotLocale,
  JobCopilotLocalizedWorkspace
>;

export interface JobCopilotAiResponse {
  analysisId: string;
  mode: JobCopilotMode;
  locales: JobCopilotLocalizedWorkspaces;
  suggestedSkills: string[];
}

export interface JobCopilotResponse {
  analysisId: string;
  mode: JobCopilotMode;
  locales: JobCopilotLocalizedWorkspaces;
  suggestedSkills: JobCopilotSuggestedSkill[];
}
