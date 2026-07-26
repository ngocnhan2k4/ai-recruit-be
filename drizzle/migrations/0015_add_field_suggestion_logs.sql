ALTER TABLE "ai_cvs" ADD COLUMN IF NOT EXISTS "field_suggestion_logs" jsonb DEFAULT '[]'::jsonb;
