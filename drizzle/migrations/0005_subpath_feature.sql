CREATE TABLE IF NOT EXISTS "option_subpaths" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "option_id" uuid REFERENCES "roadmap_skill_options"("id") ON DELETE CASCADE,
  "skill_id" uuid REFERENCES "roadmap_skills"("id") ON DELETE CASCADE,
  "title" varchar(500) NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "duration" varchar(100) NOT NULL DEFAULT '',
  "tags" jsonb NOT NULL DEFAULT '[]',
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp,
  "deleted_at" timestamp
);

CREATE INDEX IF NOT EXISTS "idx_option_subpaths_option" ON "option_subpaths" ("option_id", "deleted_at");
CREATE INDEX IF NOT EXISTS "idx_option_subpaths_skill" ON "option_subpaths" ("skill_id", "deleted_at");

CREATE TABLE IF NOT EXISTS "subpath_modules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "subpath_id" uuid NOT NULL REFERENCES "option_subpaths"("id") ON DELETE CASCADE,
  "title" varchar(500) NOT NULL,
  "description" text NOT NULL DEFAULT '',
  "duration" varchar(100) NOT NULL DEFAULT '',
  "category" varchar(255) NOT NULL DEFAULT '',
  "concepts" jsonb NOT NULL DEFAULT '[]',
  "order_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp,
  "deleted_at" timestamp
);

CREATE INDEX IF NOT EXISTS "idx_subpath_modules_subpath_order" ON "subpath_modules" ("subpath_id", "deleted_at", "order_index");

CREATE TABLE IF NOT EXISTS "subpath_resources" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "module_id" uuid NOT NULL REFERENCES "subpath_modules"("id") ON DELETE CASCADE,
  "title" varchar(500) NOT NULL,
  "url" text NOT NULL DEFAULT '',
  "type" varchar(50) NOT NULL DEFAULT 'article',
  "description" text NOT NULL DEFAULT '',
  "is_free" boolean NOT NULL DEFAULT true,
  "quick_check" jsonb NOT NULL DEFAULT '[]',
  "order_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp,
  "deleted_at" timestamp
);

CREATE INDEX IF NOT EXISTS "idx_subpath_resources_module_order" ON "subpath_resources" ("module_id", "deleted_at", "order_index");

CREATE TABLE IF NOT EXISTS "subpath_quiz_questions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "module_id" uuid NOT NULL REFERENCES "subpath_modules"("id") ON DELETE CASCADE,
  "question" text NOT NULL,
  "options" jsonb NOT NULL,
  "correct_answer_index" integer NOT NULL,
  "explanation" text NOT NULL DEFAULT '',
  "order_index" integer NOT NULL DEFAULT 0,
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp,
  "deleted_at" timestamp
);

CREATE INDEX IF NOT EXISTS "idx_subpath_quiz_module" ON "subpath_quiz_questions" ("module_id", "deleted_at");

CREATE TABLE IF NOT EXISTS "option_resource_completions" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "resource_id" uuid NOT NULL REFERENCES "subpath_resources"("id") ON DELETE CASCADE,
  "completed_at" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp,
  "deleted_at" timestamp
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_resource_completions_user_resource" ON "option_resource_completions" ("user_id", "resource_id");


CREATE TABLE IF NOT EXISTS "subpath_module_quiz_results" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id" uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "module_id" uuid NOT NULL REFERENCES "subpath_modules"("id") ON DELETE CASCADE,
  "score" integer NOT NULL DEFAULT 0,
  "total_questions" integer NOT NULL DEFAULT 0,
  "passed" boolean NOT NULL DEFAULT false,
  "attempted_at" timestamp NOT NULL DEFAULT now(),
  "created_at" timestamp DEFAULT now(),
  "updated_at" timestamp,
  "deleted_at" timestamp
);

CREATE INDEX IF NOT EXISTS "idx_quiz_results_user_module" ON "subpath_module_quiz_results" ("user_id", "module_id");
