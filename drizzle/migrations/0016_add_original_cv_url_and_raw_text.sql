ALTER TABLE "ai_cvs" ADD COLUMN IF NOT EXISTS "original_cv_url" text;
ALTER TABLE "ai_cvs" ADD COLUMN IF NOT EXISTS "old_raw_text" text;
