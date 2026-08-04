import {
  index,
  integer,
  jsonb,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { organizations } from "./organization.model";
import { users } from "./user.model";
import { timestamps } from "./helpers";
import { jobCopilotConversations } from "./job-copilot-conversation.model";

export const jobCopilotDrafts = pgTable(
  "job_copilot_drafts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id").references(
      () => jobCopilotConversations.id,
    ),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    locale: varchar("locale", { length: 5 }).notNull().default("vi"),
    formData: jsonb("form_data").$type<Record<string, unknown>>().notNull(),
    analysisResult: jsonb("analysis_result"),
    analyzedContent: jsonb("analyzed_content"),
    screeningQuestions: jsonb("screening_questions").notNull().default([]),
    suggestionStatuses: jsonb("suggestion_statuses").notNull().default({}),
    version: integer("version").notNull().default(1),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("uniq_active_job_copilot_draft_conversation_locale")
      .on(table.conversationId, table.locale)
      .where(sql`${table.deletedAt} IS NULL`),
    uniqueIndex("uniq_active_job_copilot_draft_legacy_locale")
      .on(table.organizationId, table.createdBy, table.locale)
      .where(
        sql`${table.deletedAt} IS NULL AND ${table.conversationId} IS NULL`,
      ),
    index("idx_job_copilot_drafts_conversation").on(table.conversationId),
    index("idx_job_copilot_drafts_org_user").on(
      table.organizationId,
      table.createdBy,
      table.locale,
    ),
  ],
);
