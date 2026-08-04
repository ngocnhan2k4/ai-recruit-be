-- Ensure shared object_type enum has activity target values
ALTER TYPE "object_type" ADD VALUE IF NOT EXISTS 'JOB';
--> statement-breakpoint
ALTER TYPE "object_type" ADD VALUE IF NOT EXISTS 'USER';
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "activities" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "created_by" uuid NOT NULL,
  "organization_id" uuid,
  "action" varchar(255) NOT NULL,
  "metadata" jsonb DEFAULT '{}'::jsonb,
  "target_id" varchar(64),
  "target_type" "object_type" NOT NULL,
  "visibility" varchar(32) DEFAULT 'admin_only' NOT NULL,
  "created_at" timestamp DEFAULT now() NOT NULL,
  "updated_at" timestamp,
  "deleted_at" timestamp
);
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "activities"
    ADD CONSTRAINT "activities_created_by_users_id_fk"
    FOREIGN KEY ("created_by") REFERENCES "public"."users"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
  ALTER TABLE "activities"
    ADD CONSTRAINT "activities_organization_id_organizations_id_fk"
    FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id")
    ON DELETE cascade ON UPDATE no action;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activity_entity" ON "activities" USING btree ("target_type","target_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activity_actor" ON "activities" USING btree ("created_by");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activity_org" ON "activities" USING btree ("organization_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activity_visibility" ON "activities" USING btree ("visibility");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_activity_created_at" ON "activities" USING btree ("created_at");
