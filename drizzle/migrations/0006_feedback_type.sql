ALTER TABLE "feedbacks"
  ADD COLUMN IF NOT EXISTS "type" "feedback_type" NOT NULL DEFAULT 'feedback';

UPDATE "feedbacks"
SET "type" = 'survey'
WHERE COALESCE("metadata"->>'surveyKey', '') <> '';
