-- Migration: Refactor questions table to skill-based system
-- Remove area dependency and change difficulty to difficultyLevels array

-- STEP 1: Add new column for difficulty levels (before dropping old column)
ALTER TABLE questions ADD COLUMN IF NOT EXISTS difficulty_levels jsonb NOT NULL DEFAULT '["medium"]'::jsonb;

-- STEP 2: Convert existing difficulty data to array format
UPDATE questions
SET difficulty_levels = jsonb_build_array(difficulty::text)
WHERE difficulty IS NOT NULL;

-- STEP 3: Drop old columns
ALTER TABLE questions DROP CONSTRAINT IF EXISTS questions_area_id_areas_id_fk;
ALTER TABLE questions DROP COLUMN IF EXISTS area_id;
ALTER TABLE questions DROP COLUMN IF EXISTS difficulty;

-- STEP 4: Add database constraints for data integrity
ALTER TABLE questions
ADD CONSTRAINT check_difficulty_levels_length
CHECK (jsonb_array_length(difficulty_levels) BETWEEN 1 AND 3);

ALTER TABLE questions
ADD CONSTRAINT check_difficulty_levels_values
CHECK (
  NOT EXISTS (
    SELECT 1 FROM jsonb_array_elements_text(difficulty_levels) elem
    WHERE elem NOT IN ('easy', 'medium', 'hard', 'advanced', 'expert')
  )
);

-- STEP 5: Add GIN index for performance on jsonb queries
CREATE INDEX IF NOT EXISTS idx_questions_difficulty_levels ON questions USING GIN (difficulty_levels);
