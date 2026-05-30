ALTER TABLE "feedbacks" ADD COLUMN IF NOT EXISTS "metadata" jsonb;

CREATE INDEX IF NOT EXISTS "idx_feedbacks_user_survey_key"
  ON "feedbacks" ("user_id", ((metadata->>'surveyKey')));
