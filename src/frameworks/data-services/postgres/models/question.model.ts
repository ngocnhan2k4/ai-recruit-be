import {
  pgTable,
  uuid,
  text,
  jsonb,
  integer,
  boolean,
  varchar,
} from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";
import { skills } from "./skill.model";
import { areas } from "./area.model";

export const difficultyEnum = ["easy", "medium", "hard"] as const;
export type Difficulty = (typeof difficultyEnum)[number];

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().defaultRandom(),
  skillId: uuid("skill_id")
    .notNull()
    .references(() => skills.id, { onDelete: "cascade" }),
  areaId: uuid("area_id")
    .notNull()
    .references(() => areas.id, { onDelete: "cascade" }),
  questionText: text("question_text").notNull(),
  options: jsonb("options").$type<string[]>().notNull(),
  correctAnswer: varchar("correct_answer", { length: 255 }).notNull(),
  point: integer("point").notNull().default(1),
  difficulty: varchar("difficulty", { length: 50 })
    .$type<Difficulty>()
    .notNull()
    .default("medium"),
  isActive: boolean("is_active").notNull().default(true),
  ...timestamps,
});
