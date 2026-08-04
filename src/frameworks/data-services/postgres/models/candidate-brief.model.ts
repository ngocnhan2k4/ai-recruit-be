import {
  char,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import type { CandidateBriefAnalysis } from "@/core/entities";
import { applyJobs } from "./job.model";
import { organizations } from "./organization.model";
import { users } from "./user.model";
import { timestamps } from "./helpers";

export const candidateBriefs = pgTable(
  "candidate_briefs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    applicationId: uuid("application_id")
      .notNull()
      .references(() => applyJobs.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    analysisResult: jsonb("analysis_result")
      .$type<CandidateBriefAnalysis>()
      .notNull(),
    inputFingerprint: char("input_fingerprint", { length: 64 }).notNull(),
    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("uniq_active_candidate_brief_application")
      .on(table.applicationId)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_candidate_briefs_org_application").on(
      table.organizationId,
      table.applicationId,
    ),
  ],
);
