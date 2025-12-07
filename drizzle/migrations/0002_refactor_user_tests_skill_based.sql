-- Migration: Refactor user_tests table to skill-based assessment
-- Remove area dependency and add per-skill level assessment

-- STEP 1: Add new columns
ALTER TABLE user_tests ADD COLUMN IF NOT EXISTS selected_difficulty_levels jsonb;
ALTER TABLE user_tests ADD COLUMN IF NOT EXISTS skill_levels_assessed jsonb;

-- STEP 2: Convert existing level_assessed data to skill-based format (preserve legacy data)
UPDATE user_tests
SET skill_levels_assessed = jsonb_build_object('legacy', level_assessed)
WHERE level_assessed IS NOT NULL;

-- STEP 3: Drop old columns
ALTER TABLE user_tests DROP CONSTRAINT IF EXISTS user_tests_area_id_areas_id_fk;
ALTER TABLE user_tests DROP COLUMN IF EXISTS area_id;
ALTER TABLE user_tests DROP COLUMN IF EXISTS level_assessed;
