ALTER TABLE "subpaths" ADD COLUMN "roadmap_skill_option_id" uuid REFERENCES "roadmap_skill_options"("id") ON DELETE CASCADE;

CREATE UNIQUE INDEX "idx_subpaths_option_id" ON "subpaths" ("roadmap_skill_option_id") WHERE "roadmap_skill_option_id" IS NOT NULL;
