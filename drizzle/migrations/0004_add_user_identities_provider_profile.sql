ALTER TABLE "user_identities"
  ADD COLUMN IF NOT EXISTS "provider_email" varchar(255),
  ADD COLUMN IF NOT EXISTS "provider_name" varchar(255),
  ADD COLUMN IF NOT EXISTS "provider_picture" varchar(500);
