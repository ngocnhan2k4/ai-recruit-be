import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { users } from "./user.model";
import { timestamps } from "./helpers";
import { LanguageEnum, TemplateEnum } from "./enums";

export const aiCvs = pgTable("ai_cvs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),

  // Metadata
  title: varchar("title", { length: 255 }).notNull(),
  targetJobTitle: varchar("target_job_title", { length: 255 }),

  // CV Data
  cvData: jsonb("cv_data").notNull(), // OptimizedCvDataDto structure

  // AI Analysis Results
  atsScore: integer("ats_score"), // 0-100
  matchingSkills: text("matching_skills").array(),
  missingSkills: text("missing_skills").array(),
  recommendation: text("recommendation"),

  // Original Context
  jobDescription: text("job_description"),
  originalCvFilename: varchar("original_cv_filename", { length: 255 }),

  // Settings
  language: LanguageEnum("language").default("vi").notNull(),
  isFavorite: boolean("is_favorite").default(false).notNull(),
  template: TemplateEnum("template").default("classic").notNull(),

  // Timestamps
  ...timestamps,
});
