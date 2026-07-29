CREATE TABLE IF NOT EXISTS "candidate_briefs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "application_id" uuid NOT NULL,
  "organization_id" uuid NOT NULL,
  "created_by" uuid NOT NULL,
  "analysis_result" jsonb NOT NULL,
  "input_fingerprint" char(64) NOT NULL,
  "generated_at" timestamp DEFAULT now() NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp,
  "deleted_at" timestamp,
  CONSTRAINT "candidate_briefs_application_id_apply_jobs_id_fk"
    FOREIGN KEY ("application_id") REFERENCES "public"."apply_jobs"("id"),
  CONSTRAINT "candidate_briefs_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id"),
  CONSTRAINT "candidate_briefs_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "uniq_active_candidate_brief_application"
  ON "candidate_briefs" USING btree ("application_id")
  WHERE "candidate_briefs"."deleted_at" IS NULL;

CREATE INDEX IF NOT EXISTS "idx_candidate_briefs_org_application"
  ON "candidate_briefs" USING btree ("organization_id", "application_id");
