import {
  pgTable,
  uuid,
  jsonb,
  integer,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./user.model";
import { type Difficulty } from "./question.model";
import { sql } from "drizzle-orm";

export const userTests = pgTable(
  "user_tests",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    selectedSkillIds: jsonb("selected_skill_ids").$type<string[]>().notNull(),
    selectedDifficultyLevels: jsonb("selected_difficulty_levels").$type<
      Difficulty[]
    >(),
    questionIds: jsonb("question_ids").$type<string[]>(),
    totalScore: integer("total_score"),
    skillLevelsAssessed: jsonb("skill_levels_assessed").$type<
      Record<string, string>
    >(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => [
    index("idx_user_tests_user_created").on(
      table.userId,
      sql`${table.createdAt} DESC`,
    ),
  ],
);
