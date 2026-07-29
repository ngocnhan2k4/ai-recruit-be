CREATE TABLE IF NOT EXISTS "job_copilot_conversations" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" uuid NOT NULL REFERENCES "organizations"("id"),
  "created_by" uuid NOT NULL REFERENCES "users"("id"),
  "status" varchar(30) NOT NULL DEFAULT 'collecting',
  "brief_data" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "workspace_state" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "version" integer NOT NULL DEFAULT 1,
  "processing_request_id" uuid,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp,
  "deleted_at" timestamp
);

CREATE INDEX IF NOT EXISTS "idx_job_copilot_conversations_owner"
  ON "job_copilot_conversations" ("organization_id", "created_by", "updated_at");

CREATE TABLE IF NOT EXISTS "job_copilot_messages" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "conversation_id" uuid NOT NULL REFERENCES "job_copilot_conversations"("id"),
  "role" varchar(20) NOT NULL,
  "message_type" varchar(30) NOT NULL DEFAULT 'text',
  "content" text NOT NULL,
  "metadata" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "client_message_id" uuid,
  "created_at" timestamp NOT NULL DEFAULT now(),
  "updated_at" timestamp,
  "deleted_at" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_job_copilot_message_client"
  ON "job_copilot_messages" ("conversation_id", "client_message_id")
  WHERE "client_message_id" IS NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_job_copilot_messages_conversation"
  ON "job_copilot_messages" ("conversation_id", "created_at");

ALTER TABLE "job_copilot_drafts"
  ADD COLUMN IF NOT EXISTS "conversation_id" uuid
  REFERENCES "job_copilot_conversations"("id");

DROP INDEX IF EXISTS "uniq_active_job_copilot_draft_recruiter_org_locale";

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_active_job_copilot_draft_conversation_locale"
  ON "job_copilot_drafts" ("conversation_id", "locale")
  WHERE "deleted_at" IS NULL AND "conversation_id" IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_active_job_copilot_draft_legacy_locale"
  ON "job_copilot_drafts" ("organization_id", "created_by", "locale")
  WHERE "deleted_at" IS NULL AND "conversation_id" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_job_copilot_drafts_conversation"
  ON "job_copilot_drafts" ("conversation_id");
