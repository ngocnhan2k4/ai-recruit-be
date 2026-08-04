import type {
  JobCopilotDraftRecord,
  SaveJobCopilotDraft,
} from "@/core/entities/job-copilot-draft.entity";
import type { JobCopilotLocale } from "@/core/entities/job-copilot.entity";

export abstract class IJobCopilotDraftRepository {
  abstract findActive(
    organizationId: string,
    createdBy: string,
    locale: JobCopilotLocale,
    conversationId?: string,
  ): Promise<JobCopilotDraftRecord | null>;

  abstract save(
    organizationId: string,
    createdBy: string,
    draft: SaveJobCopilotDraft,
  ): Promise<JobCopilotDraftRecord | null>;

  abstract softDelete(
    organizationId: string,
    createdBy: string,
    conversationId?: string,
  ): Promise<boolean>;
}
