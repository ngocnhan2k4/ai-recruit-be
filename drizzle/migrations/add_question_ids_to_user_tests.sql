-- Migration: Add questionIds field to user_tests table
-- This field stores the list of question IDs for each exam so we can validate completeness and allow continuation

ALTER TABLE user_tests 
ADD COLUMN IF NOT EXISTS question_ids jsonb;

-- Add comment for documentation
COMMENT ON COLUMN user_tests.question_ids IS 'Array of question IDs for this exam. Used to validate completeness and allow continuation of incomplete exams.';

