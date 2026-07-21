CREATE TYPE "public"."learning_roadmap_generation_status" AS ENUM('pending', 'in_progress', 'finished', 'failed');

ALTER TABLE "learning_roadmaps"
  ADD COLUMN IF NOT EXISTS "generation_status" "learning_roadmap_generation_status" NOT NULL DEFAULT 'pending';

ALTER TABLE "learning_roadmaps"
  ADD COLUMN IF NOT EXISTS "metadata" jsonb;
