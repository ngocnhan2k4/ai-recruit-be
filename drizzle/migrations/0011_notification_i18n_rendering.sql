BEGIN;

ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "preferred_language" "language" DEFAULT 'vi' NOT NULL;

ALTER TABLE "notifications"
  ADD COLUMN IF NOT EXISTS "template_key" varchar(100),
  ADD COLUMN IF NOT EXISTS "template_data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "snapshot_language_code" varchar(5);

COMMIT;
