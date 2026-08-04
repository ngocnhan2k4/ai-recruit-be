ALTER TABLE "job_copilot_drafts"
  ADD COLUMN IF NOT EXISTS "locale" varchar(5) NOT NULL DEFAULT 'vi';

DROP INDEX IF EXISTS "uniq_active_job_copilot_draft_recruiter_org";

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_active_job_copilot_draft_recruiter_org_locale"
  ON "job_copilot_drafts" ("organization_id", "created_by", "locale")
  WHERE "deleted_at" IS NULL;

DROP INDEX IF EXISTS "idx_job_copilot_drafts_org_user";

CREATE INDEX IF NOT EXISTS "idx_job_copilot_drafts_org_user"
  ON "job_copilot_drafts" ("organization_id", "created_by", "locale");
