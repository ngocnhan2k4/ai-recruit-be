import type {
  JobCopilotGeneratedDraft,
  JobCopilotLocale,
  JobCopilotResponse,
  ScreeningQuestion,
} from "./job-copilot.entity";

export type JobCopilotSuggestionStatus = "pending" | "applied" | "skipped";

export interface JobCopilotDraftState {
  formData: Record<string, unknown>;
  analysisResult: JobCopilotResponse | null;
  analyzedContent: JobCopilotGeneratedDraft | null;
  screeningQuestions: ScreeningQuestion[];
  suggestionStatuses: Record<string, JobCopilotSuggestionStatus>;
}

export interface SaveJobCopilotDraft extends JobCopilotDraftState {
  locale: JobCopilotLocale;
  expectedVersion: number;
}

export interface JobCopilotDraftRecord extends JobCopilotDraftState {
  id: string;
  organizationId: string;
  createdBy: string;
  locale: JobCopilotLocale;
  version: number;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
}
