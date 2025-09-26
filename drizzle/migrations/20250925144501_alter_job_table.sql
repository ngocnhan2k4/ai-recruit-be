ALTER TABLE "jobs"
ALTER COLUMN "description"
TYPE json
USING description::json;
