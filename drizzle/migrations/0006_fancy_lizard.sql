ALTER TABLE "jobs" 
  ALTER COLUMN "description" 
  SET DATA TYPE json 
  USING description::json;
