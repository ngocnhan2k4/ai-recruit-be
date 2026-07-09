-- Create user_subpath_snapshots table
CREATE TABLE IF NOT EXISTS "user_subpath_snapshots" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "roadmap_skill_option_id" uuid NOT NULL UNIQUE REFERENCES "roadmap_skill_options"("id") ON DELETE CASCADE,
  "snapshot_of_id" uuid NOT NULL REFERENCES "subpaths"("id") ON DELETE RESTRICT,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp,
  "deleted_at" timestamp
);

CREATE INDEX IF NOT EXISTS "idx_user_subpath_snapshots_option" ON "user_subpath_snapshots"("roadmap_skill_option_id");
CREATE INDEX IF NOT EXISTS "idx_user_subpath_snapshots_user" ON "user_subpath_snapshots"("user_id");

-- Add snapshotId to subpath_modules so user-added modules link to snapshot
ALTER TABLE "subpath_modules" ADD COLUMN IF NOT EXISTS "snapshot_id" uuid REFERENCES "user_subpath_snapshots"("id") ON DELETE CASCADE;

-- Remove roadmapSkillOptionId from subpaths (now in user_subpath_snapshots)
ALTER TABLE "subpaths" DROP CONSTRAINT IF EXISTS "subpaths_roadmap_skill_option_id_roadmap_skill_options_id_fk";
DROP INDEX IF EXISTS "idx_subpaths_option_id";
ALTER TABLE "subpaths" DROP COLUMN IF EXISTS "roadmap_skill_option_id";
