import {
  pgTable,
  uuid,
  text,
  jsonb,
  boolean,
  varchar,
} from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";
import { skills } from "./skill.model";

export const difficultyEnum = [
  "easy",
  "medium",
  "hard",
  "advanced",
  "expert",
] as const;
export type Difficulty = (typeof difficultyEnum)[number];

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  skillId: uuid("skill_id")
    .notNull()
    .references(() => skills.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correctAnswer: varchar("correct_answer", { length: 255 }).notNull(),
  difficultyLevels: jsonb("difficulty_levels")
    .$type<Difficulty[]>()
    .notNull()
    .$defaultFn(() => ["medium"]),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});
