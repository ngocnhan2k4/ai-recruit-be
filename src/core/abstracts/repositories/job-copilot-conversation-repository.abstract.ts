import type {
  JobCopilotChatBrief,
  JobCopilotConversationRecord,
  JobCopilotMessageRecord,
  JobCopilotMessageType,
  JobCopilotResponse,
} from "@/core/entities";

export abstract class IJobCopilotConversationRepository {
  abstract create(
    organizationId: string,
    createdBy: string,
  ): Promise<JobCopilotConversationRecord>;

  abstract findOwned(
    id: string,
    organizationId: string,
    createdBy: string,
  ): Promise<JobCopilotConversationRecord | null>;

  abstract findLatest(
    organizationId: string,
    createdBy: string,
  ): Promise<JobCopilotConversationRecord | null>;

  abstract listMessages(
    conversationId: string,
  ): Promise<JobCopilotMessageRecord[]>;

  abstract addMessage(input: {
    conversationId: string;
    role: "user" | "assistant";
    messageType: JobCopilotMessageType;
    content: string;
    metadata?: Record<string, unknown>;
    clientMessageId?: string;
  }): Promise<{ message: JobCopilotMessageRecord; created: boolean }>;

  abstract beginProcessing(
    conversationId: string,
    requestId: string,
  ): Promise<JobCopilotConversationRecord>;

  abstract finishCollecting(input: {
    conversationId: string;
    requestId: string;
    brief: JobCopilotChatBrief;
  }): Promise<boolean>;

  abstract finishCompleted(input: {
    conversation: JobCopilotConversationRecord;
    requestId: string;
    brief: JobCopilotChatBrief;
    workspace: JobCopilotResponse;
  }): Promise<boolean>;

  abstract markFailed(conversationId: string, requestId: string): Promise<void>;

  abstract undoLastRevision(
    conversationId: string,
    organizationId: string,
    createdBy: string,
  ): Promise<boolean>;

  abstract softDelete(
    conversationId: string,
    organizationId: string,
    createdBy: string,
  ): Promise<boolean>;
}
