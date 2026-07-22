CREATE TYPE "roadmap_generation_status" AS ENUM ('pending', 'completed', 'failed');

ALTER TABLE "learning_roadmaps"
  ADD COLUMN IF NOT EXISTS "generation_status" "roadmap_generation_status"
  NOT NULL DEFAULT 'pending';
