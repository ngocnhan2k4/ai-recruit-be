import {
  pgTable,
  uuid,
  varchar,
  boolean,
  integer,
  timestamp,
} from "drizzle-orm/pg-core";
import { userTests } from "./user-test.model";
import { questions } from "./question.model";

export const userAnswers = pgTable("user_answers", {
  id: uuid("id").primaryKey().defaultRandom(),
  userTestId: uuid("user_test_id")
    .notNull()
    .references(() => userTests.id, { onDelete: "cascade" }),
  questionId: uuid("question_id")
    .notNull()
    .references(() => questions.id, { onDelete: "cascade" }),
  chosenAnswer: varchar("chosen_answer", { length: 255 }).notNull(),
  isCorrect: boolean("is_correct").notNull(),
  pointGained: integer("point_gained").notNull().default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});
