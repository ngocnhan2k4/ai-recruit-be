import { pgTable, uuid, jsonb, integer, timestamp } from "drizzle-orm/pg-core";
import { users } from "./user.model";
import { type Difficulty } from "./question.model";

export const userTests = pgTable("user_tests", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  selectedSkillIds: jsonb("selected_skill_ids").$type<string[]>().notNull(),
  selectedDifficultyLevels: jsonb("selected_difficulty_levels").$type<
    Difficulty[]
  >(),
  totalScore: integer("total_score"),
  skillLevelsAssessed: jsonb("skill_levels_assessed").$type<
    Record<string, string>
  >(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
