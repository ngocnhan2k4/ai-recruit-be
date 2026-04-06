ALTER TYPE "notification_type" ADD VALUE 'feedback_assigned';

ALTER TABLE "feedbacks" ADD COLUMN IF NOT EXISTS "assigned_to_user_id" uuid REFERENCES "users"("id") ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS "idx_feedbacks_assigned_to_user_id" ON "feedbacks" ("assigned_to_user_id");
