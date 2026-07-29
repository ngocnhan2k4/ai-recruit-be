-- Add source column to track how a user_skill was acquired (e.g. 'exam').
ALTER TABLE "user_skills"
  ADD COLUMN IF NOT EXISTS "source" varchar(50);
