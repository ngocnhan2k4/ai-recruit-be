import type {
  JobCopilotDraftRecord,
  SaveJobCopilotDraft,
} from "@/core/entities/job-copilot-draft.entity";

export abstract class IJobCopilotDraftRepository {
  abstract findActive(
    organizationId: string,
    createdBy: string,
  ): Promise<JobCopilotDraftRecord | null>;

  abstract save(
    organizationId: string,
    createdBy: string,
    draft: SaveJobCopilotDraft,
  ): Promise<JobCopilotDraftRecord | null>;

  abstract softDelete(
    organizationId: string,
    createdBy: string,
  ): Promise<boolean>;
}
