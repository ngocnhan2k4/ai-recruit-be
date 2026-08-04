import { Inject, Injectable } from "@nestjs/common";
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type {
  JobCopilotChatBrief,
  JobCopilotConversationRecord,
  JobCopilotMessageRecord,
  JobCopilotResponse,
} from "@/core/entities";
import { IJobCopilotConversationRepository } from "@/core";
import {
  jobCopilotConversations,
  jobCopilotDrafts,
  jobCopilotMessages,
} from "../models";
import type { DBDrizzle } from "../types";

@Injectable()
export class JobCopilotConversationRepository
  implements IJobCopilotConversationRepository
{
  constructor(@Inject("DRIZZLE") private readonly db: DBDrizzle) {}

  async create(organizationId: string, createdBy: string) {
    const [row] = await this.db
      .insert(jobCopilotConversations)
      .values({
        organizationId,
        createdBy,
        briefData: {
          locations: [],
          locationIds: [],
          salaryNegotiable: true,
          skills: [],
        },
      })
      .returning();
    return row as JobCopilotConversationRecord;
  }

  async findOwned(id: string, organizationId: string, createdBy: string) {
    const [row] = await this.db
      .select()
      .from(jobCopilotConversations)
      .where(
        and(
          eq(jobCopilotConversations.id, id),
          eq(jobCopilotConversations.organizationId, organizationId),
          eq(jobCopilotConversations.createdBy, createdBy),
          isNull(jobCopilotConversations.deletedAt),
        ),
      )
      .limit(1);
    return (row as JobCopilotConversationRecord | undefined) ?? null;
  }

  async findLatest(organizationId: string, createdBy: string) {
    const [row] = await this.db
      .select()
      .from(jobCopilotConversations)
      .where(
        and(
          eq(jobCopilotConversations.organizationId, organizationId),
          eq(jobCopilotConversations.createdBy, createdBy),
          isNull(jobCopilotConversations.deletedAt),
        ),
      )
      .orderBy(
        desc(jobCopilotConversations.updatedAt),
        desc(jobCopilotConversations.createdAt),
      )
      .limit(1);
    return (row as JobCopilotConversationRecord | undefined) ?? null;
  }

  async listMessages(conversationId: string) {
    return (await this.db
      .select()
      .from(jobCopilotMessages)
      .where(
        and(
          eq(jobCopilotMessages.conversationId, conversationId),
          isNull(jobCopilotMessages.deletedAt),
        ),
      )
      .orderBy(jobCopilotMessages.createdAt)) as JobCopilotMessageRecord[];
  }

  async addMessage(input: {
    conversationId: string;
    role: "user" | "assistant";
    messageType: JobCopilotMessageRecord["messageType"];
    content: string;
    metadata?: Record<string, unknown>;
    clientMessageId?: string;
  }) {
    if (input.clientMessageId) {
      const [existing] = await this.db
        .select()
        .from(jobCopilotMessages)
        .where(
          and(
            eq(jobCopilotMessages.conversationId, input.conversationId),
            eq(jobCopilotMessages.clientMessageId, input.clientMessageId),
            isNull(jobCopilotMessages.deletedAt),
          ),
        )
        .limit(1);
      if (existing) {
        return {
          message: existing as JobCopilotMessageRecord,
          created: false,
        };
      }
    }
    const [message] = await this.db
      .insert(jobCopilotMessages)
      .values({
        conversationId: input.conversationId,
        role: input.role,
        messageType: input.messageType,
        content: input.content,
        metadata: input.metadata ?? {},
        clientMessageId: input.clientMessageId,
      })
      .onConflictDoNothing()
      .returning();
    if (message) {
      return { message: message as JobCopilotMessageRecord, created: true };
    }
    const [existing] = await this.db
      .select()
      .from(jobCopilotMessages)
      .where(
        and(
          eq(jobCopilotMessages.conversationId, input.conversationId),
          eq(jobCopilotMessages.clientMessageId, input.clientMessageId!),
          isNull(jobCopilotMessages.deletedAt),
        ),
      )
      .limit(1);
    return {
      message: existing as JobCopilotMessageRecord,
      created: false,
    };
  }

  async beginProcessing(conversationId: string, requestId: string) {
    const [row] = await this.db
      .update(jobCopilotConversations)
      .set({
        status: "generating",
        processingRequestId: requestId,
        version: sql`${jobCopilotConversations.version} + 1`,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobCopilotConversations.id, conversationId),
          isNull(jobCopilotConversations.deletedAt),
        ),
      )
      .returning();
    return row as JobCopilotConversationRecord;
  }

  async finishCollecting(input: {
    conversationId: string;
    requestId: string;
    brief: JobCopilotChatBrief;
  }) {
    const rows = await this.db
      .update(jobCopilotConversations)
      .set({
        briefData: input.brief,
        status: "collecting",
        processingRequestId: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobCopilotConversations.id, input.conversationId),
          eq(jobCopilotConversations.processingRequestId, input.requestId),
          isNull(jobCopilotConversations.deletedAt),
        ),
      )
      .returning({ id: jobCopilotConversations.id });
    return rows.length > 0;
  }

  async finishCompleted(input: {
    conversation: JobCopilotConversationRecord;
    requestId: string;
    brief: JobCopilotChatBrief;
    workspace: JobCopilotResponse;
  }) {
    return this.db.transaction(async (tx) => {
      const currentDrafts = {} as Record<
        "vi" | "en",
        typeof jobCopilotDrafts.$inferSelect
      >;
      for (const locale of ["vi", "en"] as const) {
        const [current] = await tx
          .select()
          .from(jobCopilotDrafts)
          .where(
            and(
              eq(jobCopilotDrafts.conversationId, input.conversation.id),
              eq(jobCopilotDrafts.locale, locale),
              isNull(jobCopilotDrafts.deletedAt),
            ),
          )
          .limit(1);
        if (current) currentDrafts[locale] = current;
      }
      const hasUndoSnapshot = Boolean(currentDrafts.vi && currentDrafts.en);
      const undoDrafts = hasUndoSnapshot
        ? Object.fromEntries(
            (["vi", "en"] as const).map((locale) => {
              const draft = currentDrafts[locale];
              return [
                locale,
                {
                  formData: draft.formData,
                  analysisResult: draft.analysisResult,
                  analyzedContent: draft.analyzedContent,
                  screeningQuestions: draft.screeningQuestions,
                  suggestionStatuses: draft.suggestionStatuses,
                },
              ];
            }),
          )
        : null;
      const [updated] = await tx
        .update(jobCopilotConversations)
        .set({
          briefData: input.brief,
          workspaceState: undoDrafts ? { undoDrafts } : {},
          status: "completed",
          processingRequestId: null,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(jobCopilotConversations.id, input.conversation.id),
            eq(jobCopilotConversations.processingRequestId, input.requestId),
            isNull(jobCopilotConversations.deletedAt),
          ),
        )
        .returning({ id: jobCopilotConversations.id });
      if (!updated) return false;

      for (const locale of ["vi", "en"] as const) {
        const localized = input.workspace.locales[locale];
        const current = currentDrafts[locale];
        const formData = {
          title: input.brief.title ?? "",
          categoryId: input.brief.categoryId ?? "",
          experience_level: input.brief.level ?? "",
          job_type: input.brief.workType ?? "",
          locations: input.brief.locationIds,
          salary_min: input.brief.salaryNegotiable
            ? undefined
            : input.brief.salaryMin,
          salary_max: input.brief.salaryNegotiable
            ? undefined
            : input.brief.salaryMax,
          skills: input.brief.skills,
          description: localized.draft.description,
          requirements: localized.draft.requirements,
          benefits: localized.draft.benefits,
        };
        const state = {
          formData,
          analysisResult: {
            analysisId: input.workspace.analysisId,
            mode: input.workspace.mode,
            ...localized,
            suggestedSkills: input.workspace.suggestedSkills,
          },
          analyzedContent: localized.draft,
          screeningQuestions: localized.screeningQuestions,
          suggestionStatuses: Object.fromEntries(
            localized.suggestions.map((item) => [item.id, "pending"]),
          ),
          updatedAt: new Date(),
        };
        if (current) {
          await tx
            .update(jobCopilotDrafts)
            .set({ ...state, version: current.version + 1 })
            .where(eq(jobCopilotDrafts.id, current.id));
        } else {
          await tx.insert(jobCopilotDrafts).values({
            conversationId: input.conversation.id,
            organizationId: input.conversation.organizationId,
            createdBy: input.conversation.createdBy,
            locale,
            ...state,
          });
        }
      }
      return true;
    });
  }

  async markFailed(conversationId: string, requestId: string) {
    await this.db
      .update(jobCopilotConversations)
      .set({
        status: "failed",
        processingRequestId: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(jobCopilotConversations.id, conversationId),
          eq(jobCopilotConversations.processingRequestId, requestId),
        ),
      );
  }

  async undoLastRevision(
    conversationId: string,
    organizationId: string,
    createdBy: string,
  ) {
    return this.db.transaction(async (tx) => {
      const [conversation] = await tx
        .select()
        .from(jobCopilotConversations)
        .where(
          and(
            eq(jobCopilotConversations.id, conversationId),
            eq(jobCopilotConversations.organizationId, organizationId),
            eq(jobCopilotConversations.createdBy, createdBy),
            isNull(jobCopilotConversations.deletedAt),
          ),
        )
        .limit(1);
      const undoDrafts = (
        conversation?.workspaceState as {
          undoDrafts?: Record<
            "vi" | "en",
            {
              formData: Record<string, unknown>;
              analysisResult: unknown;
              analyzedContent: unknown;
              screeningQuestions: unknown[];
              suggestionStatuses: Record<string, unknown>;
            }
          >;
        }
      )?.undoDrafts;
      if (!conversation || !undoDrafts?.vi || !undoDrafts?.en) return false;

      const [updated] = await tx
        .update(jobCopilotConversations)
        .set({
          workspaceState: {},
          status: "completed",
          processingRequestId: null,
          version: sql`${jobCopilotConversations.version} + 1`,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(jobCopilotConversations.id, conversationId),
            eq(jobCopilotConversations.version, conversation.version),
            isNull(jobCopilotConversations.deletedAt),
          ),
        )
        .returning({ id: jobCopilotConversations.id });
      if (!updated) return false;

      for (const locale of ["vi", "en"] as const) {
        const snapshot = undoDrafts[locale];
        const [restored] = await tx
          .update(jobCopilotDrafts)
          .set({
            ...snapshot,
            version: sql`${jobCopilotDrafts.version} + 1`,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(jobCopilotDrafts.conversationId, conversationId),
              eq(jobCopilotDrafts.locale, locale),
              isNull(jobCopilotDrafts.deletedAt),
            ),
          )
          .returning({ id: jobCopilotDrafts.id });
        if (!restored) {
          throw new Error(`Missing ${locale} Job Copilot draft during undo`);
        }
      }
      return true;
    });
  }

  async softDelete(
    conversationId: string,
    organizationId: string,
    createdBy: string,
  ) {
    return this.db.transaction(async (tx) => {
      const now = new Date();
      const [conversation] = await tx
        .update(jobCopilotConversations)
        .set({ deletedAt: now, updatedAt: now, processingRequestId: null })
        .where(
          and(
            eq(jobCopilotConversations.id, conversationId),
            eq(jobCopilotConversations.organizationId, organizationId),
            eq(jobCopilotConversations.createdBy, createdBy),
            isNull(jobCopilotConversations.deletedAt),
          ),
        )
        .returning({ id: jobCopilotConversations.id });
      if (!conversation) return false;
      await tx
        .update(jobCopilotMessages)
        .set({ deletedAt: now, updatedAt: now })
        .where(
          and(
            eq(jobCopilotMessages.conversationId, conversationId),
            isNull(jobCopilotMessages.deletedAt),
          ),
        );
      await tx
        .update(jobCopilotDrafts)
        .set({ deletedAt: now, updatedAt: now })
        .where(
          and(
            eq(jobCopilotDrafts.conversationId, conversationId),
            isNull(jobCopilotDrafts.deletedAt),
          ),
        );
      return true;
    });
  }
}
