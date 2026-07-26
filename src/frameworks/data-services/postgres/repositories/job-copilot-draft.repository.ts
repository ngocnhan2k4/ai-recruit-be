import { Inject, Injectable } from "@nestjs/common";
import { and, eq, isNull } from "drizzle-orm";
import type {
  JobCopilotDraftRecord,
  SaveJobCopilotDraft,
} from "@/core/entities/job-copilot-draft.entity";
import { IJobCopilotDraftRepository } from "@/core";
import type { DBDrizzle } from "../types";
import { jobCopilotDrafts } from "../models";

@Injectable()
export class JobCopilotDraftRepository implements IJobCopilotDraftRepository {
  constructor(@Inject("DRIZZLE") private readonly db: DBDrizzle) {}

  async findActive(
    organizationId: string,
    createdBy: string,
  ): Promise<JobCopilotDraftRecord | null> {
    const [draft] = await this.db
      .select()
      .from(jobCopilotDrafts)
      .where(
        and(
          eq(jobCopilotDrafts.organizationId, organizationId),
          eq(jobCopilotDrafts.createdBy, createdBy),
          isNull(jobCopilotDrafts.deletedAt),
        ),
      )
      .limit(1);

    return (draft as JobCopilotDraftRecord | undefined) ?? null;
  }

  async save(
    organizationId: string,
    createdBy: string,
    draft: SaveJobCopilotDraft,
  ): Promise<JobCopilotDraftRecord | null> {
    const current = await this.findActive(organizationId, createdBy);
    const state = {
      formData: draft.formData,
      analysisResult: draft.analysisResult,
      analyzedContent: draft.analyzedContent,
      screeningQuestions: draft.screeningQuestions,
      suggestionStatuses: draft.suggestionStatuses,
      updatedAt: new Date(),
    };

    if (!current) {
      if (draft.expectedVersion !== 0) return null;
      try {
        const [created] = await this.db
          .insert(jobCopilotDrafts)
          .values({ organizationId, createdBy, ...state, version: 1 })
          .returning();
        return (created as JobCopilotDraftRecord | undefined) ?? null;
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "23505"
        ) {
          return null;
        }
        throw error;
      }
    }

    if (current.version !== draft.expectedVersion) return null;
    const [updated] = await this.db
      .update(jobCopilotDrafts)
      .set({ ...state, version: current.version + 1 })
      .where(
        and(
          eq(jobCopilotDrafts.id, current.id),
          eq(jobCopilotDrafts.version, draft.expectedVersion),
          isNull(jobCopilotDrafts.deletedAt),
        ),
      )
      .returning();

    return (updated as JobCopilotDraftRecord | undefined) ?? null;
  }

  async softDelete(
    organizationId: string,
    createdBy: string,
  ): Promise<boolean> {
    const deleted = await this.db
      .update(jobCopilotDrafts)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(
        and(
          eq(jobCopilotDrafts.organizationId, organizationId),
          eq(jobCopilotDrafts.createdBy, createdBy),
          isNull(jobCopilotDrafts.deletedAt),
        ),
      )
      .returning({ id: jobCopilotDrafts.id });
    return deleted.length > 0;
  }
}
