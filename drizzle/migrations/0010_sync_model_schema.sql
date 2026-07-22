BEGIN;

ALTER TABLE "user_experiences"
  ADD COLUMN IF NOT EXISTS "language_code" varchar(5) DEFAULT 'vi' NOT NULL;

ALTER TABLE "user_onboardings"
  ADD COLUMN IF NOT EXISTS "language_code" varchar(5) DEFAULT 'vi' NOT NULL;

ALTER TABLE "user_educations"
  ADD COLUMN IF NOT EXISTS "language_code" varchar(5) DEFAULT 'vi' NOT NULL;

ALTER TABLE "feedbacks"
  ADD COLUMN IF NOT EXISTS "language_code" varchar(5) DEFAULT 'vi' NOT NULL;

ALTER TABLE "questions"
  ADD COLUMN IF NOT EXISTS "option_keys" jsonb DEFAULT '[]'::jsonb NOT NULL,
  ADD COLUMN IF NOT EXISTS "correct_answer_key" varchar(255) DEFAULT '' NOT NULL;

ALTER TABLE "comments"
  ADD COLUMN IF NOT EXISTS "language_code" varchar(5) DEFAULT 'vi' NOT NULL;

ALTER TABLE "blog_posts"
  ADD COLUMN IF NOT EXISTS "locales" jsonb DEFAULT '{}'::jsonb NOT NULL;

CREATE INDEX IF NOT EXISTS "idx_comments_parent_id"
  ON "comments" USING btree ("parent_comment_id");

UPDATE "subpath_resources"
  SET "created_at" = COALESCE("created_at", NOW());
ALTER TABLE "subpath_resources"
  ALTER COLUMN "quick_check" DROP NOT NULL,
  ALTER COLUMN "created_at" SET DEFAULT NOW(),
  ALTER COLUMN "created_at" SET NOT NULL;

UPDATE "subpath_modules"
  SET "created_at" = COALESCE("created_at", NOW());
ALTER TABLE "subpath_modules"
  ALTER COLUMN "created_at" SET DEFAULT NOW(),
  ALTER COLUMN "created_at" SET NOT NULL;

UPDATE "subpath_quiz_questions"
  SET "created_at" = COALESCE("created_at", NOW());
ALTER TABLE "subpath_quiz_questions"
  ALTER COLUMN "created_at" SET DEFAULT NOW(),
  ALTER COLUMN "created_at" SET NOT NULL;

UPDATE "option_resource_completions"
  SET "created_at" = COALESCE("created_at", NOW());
ALTER TABLE "option_resource_completions"
  ALTER COLUMN "created_at" SET DEFAULT NOW(),
  ALTER COLUMN "created_at" SET NOT NULL;

UPDATE "subpath_module_quiz_results"
  SET "created_at" = COALESCE("created_at", NOW());
ALTER TABLE "subpath_module_quiz_results"
  ALTER COLUMN "created_at" SET DEFAULT NOW(),
  ALTER COLUMN "created_at" SET NOT NULL;

UPDATE "subpaths"
  SET "created_at" = COALESCE("created_at", NOW());
ALTER TABLE "subpaths"
  ALTER COLUMN "option_name" DROP DEFAULT,
  ALTER COLUMN "target_role" DROP DEFAULT,
  ALTER COLUMN "current_role" DROP DEFAULT,
  ALTER COLUMN "created_at" SET DEFAULT NOW(),
  ALTER COLUMN "created_at" SET NOT NULL;

COMMIT;
