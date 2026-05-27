import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { blogCategories, blogPosts } from "./blog.model";
import { features } from "./subscription.model";
import { questions } from "./question.model";
import { roadmapPhases, roadmapSkills } from "./learning-path.model";
import { timestamps } from "./helpers";

export const blogCategoriesTranslation = pgTable(
  "blog_categories_translation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => blogCategories.id, { onDelete: "cascade" }),
    languageCode: varchar("language_code", { length: 5 }).notNull(),
    name: varchar("name", { length: 50 }).notNull(),
    description: text("description"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_blog_cat_trans_unique").on(
      table.categoryId,
      table.languageCode,
    ),
    index("idx_blog_cat_trans_lookup").on(table.categoryId, table.languageCode),
  ],
);

export const blogPostsTranslation = pgTable(
  "blog_posts_translation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    postId: uuid("post_id")
      .notNull()
      .references(() => blogPosts.id, { onDelete: "cascade" }),
    languageCode: varchar("language_code", { length: 5 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    summary: text("summary").notNull(),
    content: text("content").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_blog_post_trans_unique").on(
      table.postId,
      table.languageCode,
    ),
    index("idx_blog_post_trans_lookup").on(table.postId, table.languageCode),
  ],
);

export const featureTranslation = pgTable(
  "features_translation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    featureId: bigint("feature_id", { mode: "number" })
      .notNull()
      .references(() => features.id, { onDelete: "cascade" }),
    languageCode: varchar("language_code", { length: 5 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_feature_trans_unique").on(
      table.featureId,
      table.languageCode,
    ),
    index("idx_feature_trans_lookup").on(table.featureId, table.languageCode),
  ],
);

export const questionTranslation = pgTable(
  "questions_translation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    languageCode: varchar("language_code", { length: 5 }).notNull(),
    questionText: text("question_text").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    correctAnswer: varchar("correct_answer", { length: 255 }).notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_question_trans_unique").on(
      table.questionId,
      table.languageCode,
    ),
    index("idx_question_trans_lookup").on(table.questionId, table.languageCode),
  ],
);

export const roadmapPhaseTranslation = pgTable(
  "roadmap_phases_translation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    phaseId: uuid("phase_id")
      .notNull()
      .references(() => roadmapPhases.id, { onDelete: "cascade" }),
    languageCode: varchar("language_code", { length: 5 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_roadmap_phase_trans_unique").on(
      table.phaseId,
      table.languageCode,
    ),
    index("idx_roadmap_phase_trans_lookup").on(
      table.phaseId,
      table.languageCode,
    ),
  ],
);

export const roadmapSkillTranslation = pgTable(
  "roadmap_skills_translation",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => roadmapSkills.id, { onDelete: "cascade" }),
    languageCode: varchar("language_code", { length: 5 }).notNull(),
    skill: varchar("skill", { length: 500 }).notNull(),
    description: text("description").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_roadmap_skill_trans_unique").on(
      table.skillId,
      table.languageCode,
    ),
    index("idx_roadmap_skill_trans_lookup").on(
      table.skillId,
      table.languageCode,
    ),
  ],
);
