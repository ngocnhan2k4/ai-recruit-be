  CREATE UNIQUE INDEX IF NOT EXISTS "idx_question_trans_unique"
    ON "questions_translation" USING btree ("question_id", "language_code");

  CREATE INDEX IF NOT EXISTS "idx_question_trans_lookup"
    ON "questions_translation" USING btree ("question_id", "language_code");

  CREATE UNIQUE INDEX IF NOT EXISTS "idx_roadmap_phase_trans_unique"
    ON "roadmap_phases_translation" USING btree ("phase_id", "language_code");

  CREATE INDEX IF NOT EXISTS "idx_roadmap_phase_trans_lookup"
    ON "roadmap_phases_translation" USING btree ("phase_id", "language_code");

  CREATE UNIQUE INDEX IF NOT EXISTS "idx_roadmap_skill_trans_unique"
    ON "roadmap_skills_translation" USING btree ("skill_id", "language_code");

  CREATE INDEX IF NOT EXISTS "idx_roadmap_skill_trans_lookup"
    ON "roadmap_skills_translation" USING btree ("skill_id", "language_code");

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'questions_translation_question_id_questions_id_fk'
    ) THEN
      ALTER TABLE "questions_translation"
        ADD CONSTRAINT "questions_translation_question_id_questions_id_fk"
        FOREIGN KEY ("question_id")
        REFERENCES "public"."questions"("id")
        ON DELETE CASCADE;
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'roadmap_phases_translation_phase_id_roadmap_phases_id_fk'
    ) THEN
      ALTER TABLE "roadmap_phases_translation"
        ADD CONSTRAINT "roadmap_phases_translation_phase_id_roadmap_phases_id_fk"
        FOREIGN KEY ("phase_id")
        REFERENCES "public"."roadmap_phases"("id")
        ON DELETE CASCADE;
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'roadmap_skills_translation_skill_id_roadmap_skills_id_fk'
    ) THEN
      ALTER TABLE "roadmap_skills_translation"
        ADD CONSTRAINT "roadmap_skills_translation_skill_id_roadmap_skills_id_fk"
        FOREIGN KEY ("skill_id")
        REFERENCES "public"."roadmap_skills"("id")
        ON DELETE CASCADE;
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'unique_alias_source_idx'
    ) THEN
      ALTER TABLE "skills_synonyms"
        ADD CONSTRAINT "unique_alias_source_idx"
        UNIQUE ("master_skill_id", "alias_name");
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'subpath_modules_subpath_id_subpaths_id_fk'
    ) THEN
      ALTER TABLE "subpath_modules"
        ADD CONSTRAINT "subpath_modules_subpath_id_subpaths_id_fk"
        FOREIGN KEY ("subpath_id")
        REFERENCES "public"."subpaths"("id")
        ON DELETE CASCADE;
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'subpath_resources_module_id_subpath_modules_id_fk'
    ) THEN
      ALTER TABLE "subpath_resources"
        ADD CONSTRAINT "subpath_resources_module_id_subpath_modules_id_fk"
        FOREIGN KEY ("module_id")
        REFERENCES "public"."subpath_modules"("id")
        ON DELETE CASCADE;
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'subpath_quiz_questions_module_id_subpath_modules_id_fk'
    ) THEN
      ALTER TABLE "subpath_quiz_questions"
        ADD CONSTRAINT "subpath_quiz_questions_module_id_subpath_modules_id_fk"
        FOREIGN KEY ("module_id")
        REFERENCES "public"."subpath_modules"("id")
        ON DELETE CASCADE;
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'option_resource_completions_user_id_users_id_fk'
    ) THEN
      ALTER TABLE "option_resource_completions"
        ADD CONSTRAINT "option_resource_completions_user_id_users_id_fk"
        FOREIGN KEY ("user_id")
        REFERENCES "public"."users"("id")
        ON DELETE CASCADE;
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'option_resource_completions_resource_id_subpath_resources_id_fk'
    ) THEN
      ALTER TABLE "option_resource_completions"
        ADD CONSTRAINT "option_resource_completions_resource_id_subpath_resources_id_fk"
        FOREIGN KEY ("resource_id")
        REFERENCES "public"."subpath_resources"("id")
        ON DELETE CASCADE
        NOT VALID;
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'subpath_module_quiz_results_user_id_users_id_fk'
    ) THEN
      ALTER TABLE "subpath_module_quiz_results"
        ADD CONSTRAINT "subpath_module_quiz_results_user_id_users_id_fk"
        FOREIGN KEY ("user_id")
        REFERENCES "public"."users"("id")
        ON DELETE CASCADE;
    END IF;
  END $$;

  DO $$
  BEGIN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_constraint
      WHERE conname = 'subpath_module_quiz_results_module_id_subpath_modules_id_fk'
    ) THEN
      ALTER TABLE "subpath_module_quiz_results"
        ADD CONSTRAINT "subpath_module_quiz_results_module_id_subpath_modules_id_fk"
        FOREIGN KEY ("module_id")
        REFERENCES "public"."subpath_modules"("id")
        ON DELETE CASCADE;
    END IF;
  END $$;
