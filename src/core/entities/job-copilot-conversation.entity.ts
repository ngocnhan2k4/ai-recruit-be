import type { JobCopilotResponse } from "./job-copilot.entity";

export type JobCopilotConversationStatus =
  | "collecting"
  | "generating"
  | "completed"
  | "failed";
export type JobCopilotMessageRole = "user" | "assistant";
export type JobCopilotMessageType =
  | "text"
  | "clarification"
  | "generation_result"
  | "revision_result"
  | "undo_result"
  | "error";

export interface JobCopilotChatBrief {
  title?: string;
  level?: "intern" | "fresher" | "junior" | "middle" | "senior" | "lead";
  category?: string;
  categoryId?: string;
  roleContext?: string;
  workType?: "onsite" | "remote" | "hybrid";
  locations: string[];
  locationIds: string[];
  salaryNegotiable: boolean;
  salaryMin?: number;
  salaryMax?: number;
  skills: { id: string; name: string }[];
}

export interface JobCopilotConversationRecord {
  id: string;
  organizationId: string;
  createdBy: string;
  status: JobCopilotConversationStatus;
  briefData: JobCopilotChatBrief;
  workspaceState: Record<string, unknown>;
  version: number;
  processingRequestId: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

export interface JobCopilotMessageRecord {
  id: string;
  conversationId: string;
  role: JobCopilotMessageRole;
  messageType: JobCopilotMessageType;
  content: string;
  metadata: Record<string, unknown>;
  clientMessageId: string | null;
  createdAt: Date;
  updatedAt: Date | null;
  deletedAt: Date | null;
}

export interface JobCopilotChatExtractRequest {
  message: string;
  currentBrief: JobCopilotChatBrief;
  locale: "vi" | "en";
  hasWorkspace: boolean;
}

export interface JobCopilotChatBriefPatch {
  title?: string | null;
  level?: JobCopilotChatBrief["level"] | null;
  category?: string | null;
  roleContext?: string | null;
  workType?: JobCopilotChatBrief["workType"] | null;
  locations?: string[] | null;
  salaryNegotiable?: boolean | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
}

export interface JobCopilotChatExtractResponse {
  briefPatch: JobCopilotChatBriefPatch;
  intent: "update_brief" | "revise_jd";
}

export interface SendJobCopilotMessage {
  conversationId?: string;
  clientMessageId: string;
  content: string;
  locale: "vi" | "en";
  currentBrief?: JobCopilotChatBrief;
}

export interface JobCopilotConversationView {
  conversation: JobCopilotConversationRecord;
  messages: JobCopilotMessageRecord[];
}

export interface JobCopilotChatResult extends JobCopilotConversationView {
  outcome: "needs_input" | "completed";
  workspace: JobCopilotResponse | null;
}
