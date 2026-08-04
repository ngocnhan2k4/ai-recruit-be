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

  optionKeys: jsonb("option_keys").$type<string[]>().notNull().default([]),

  correctAnswer: varchar("correct_answer", { length: 255 }).notNull(),

  correctAnswerKey: varchar("correct_answer_key", { length: 255 })
    .notNull()
    .default(""),

  difficultyLevels: jsonb("difficulty_levels")
    .$type<Difficulty[]>()
    .notNull()
    .$defaultFn(() => ["medium"]),

  isActive: boolean("is_active").notNull().default(true),

  ...timestamps,
});
