CREATE TABLE IF NOT EXISTS "job_copilot_drafts" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "form_data" jsonb NOT NULL,
  "analysis_result" jsonb,
  "analyzed_content" jsonb,
  "screening_questions" jsonb NOT NULL DEFAULT '[]'::jsonb,
  "suggestion_statuses" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "version" integer NOT NULL DEFAULT 1,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp,
  "deleted_at" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_active_job_copilot_draft_recruiter_org"
  ON "job_copilot_drafts" ("organization_id", "created_by")
  WHERE "deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_job_copilot_drafts_org_user"
  ON "job_copilot_drafts" ("organization_id", "created_by");
