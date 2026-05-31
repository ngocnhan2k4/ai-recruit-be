import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
  timestamp,
  decimal,
  pgEnum,
  index,
  uniqueIndex,
  boolean,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { desc } from "drizzle-orm";
import { timestamps } from "./helpers";
import { users } from "./user.model";
import { relations } from "drizzle-orm";
import {
  GapDifficultyEnum,
  ResourceTypeEnum,
  SkillLevelEnum,
  PhaseStatusEnum,
} from "@/core";

export const phaseStatusEnum = pgEnum("phase_status", [
  PhaseStatusEnum.NOT_STARTED,
  PhaseStatusEnum.IN_PROGRESS,
  PhaseStatusEnum.COMPLETED,
]);

export const learningRoadmaps = pgTable(
  "learning_roadmaps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    title: varchar("title", { length: 500 }).notNull(),
    currentRole: varchar("current_role", { length: 255 }),
    targetRole: varchar("target_role", { length: 255 }).notNull(),
    timeCommitmentHoursPerWeek: integer(
      "time_commitment_hours_per_week",
    ).notNull(),
    currentSkills: jsonb("current_skills").$type<
      Array<{
        skillId: string;
        level: SkillLevelEnum;
      }>
    >(),

    totalWeeks: integer("total_weeks").notNull(),
    gapAnalysis: jsonb("gap_analysis")
      .$type<{
        missingSkills: string[];
        skillsToImprove: string[];
        estimatedDifficulty: GapDifficultyEnum;
      }>()
      .notNull(),

    generatedAt: timestamp("generated_at").notNull().defaultNow(),
    completedAt: timestamp("completed_at"),

    startDate: timestamp("start_date"),

    overallProgress: decimal("overall_progress", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    ...timestamps,
  },
  (table) => [
    index("idx_learning_roadmaps_user_deleted_created").on(
      table.userId,
      table.deletedAt,
      desc(table.createdAt),
    ),
  ],
);

export const roadmapPhases = pgTable(
  "roadmap_phases",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roadmapId: uuid("roadmap_id")
      .notNull()
      .references(() => learningRoadmaps.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 255 }).notNull(),
    description: text("description").notNull(),
    durationWeeks: integer("duration_weeks").notNull(),
    orderIndex: integer("order_index").notNull(),

    progress: decimal("progress", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),
    status: phaseStatusEnum("status")
      .notNull()
      .default(PhaseStatusEnum.NOT_STARTED),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),

    ...timestamps,
  },
  (table) => [
    index("idx_roadmap_phases_roadmap_deleted_order").on(
      table.roadmapId,
      table.deletedAt,
      table.orderIndex,
    ),
  ],
);

export const roadmapSkills = pgTable(
  "roadmap_skills",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    phaseId: uuid("phase_id")
      .notNull()
      .references(() => roadmapPhases.id, { onDelete: "cascade" }),

    skill: varchar("skill", { length: 500 }).notNull(),
    description: text("description").notNull(),

    weekStart: integer("week_start").notNull(),
    weekEnd: integer("week_end").notNull(),
    orderIndex: integer("order_index").notNull(),

    prerequisites: jsonb("prerequisites")
      .$type<string[]>()
      .notNull()
      .default([]),

    ...timestamps,
  },
  (table) => [
    index("idx_roadmap_skills_phase_deleted_order").on(
      table.phaseId,
      table.deletedAt,
      table.orderIndex,
    ),
  ],
);

export const roadmapSkillOptions = pgTable(
  "roadmap_skill_options",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roadmapSkillId: uuid("roadmap_skill_id")
      .notNull()
      .references(() => roadmapSkills.id, { onDelete: "cascade" }),

    optionId: varchar("option_id", { length: 255 }).notNull(),
    resources: jsonb("resources")
      .$type<
        Array<{
          title: string;
          type: ResourceTypeEnum;
          url?: string;
          isFree: boolean;
        }>
      >()
      .notNull()
      .default([]),
    keyConcepts: jsonb("key_concepts").$type<string[]>().notNull().default([]),
    completedAt: timestamp("completed_at"),

    ...timestamps,
  },
  (table) => [
    index("idx_roadmap_skill_options_skill_deleted").on(
      table.roadmapSkillId,
      table.deletedAt,
    ),
    index("idx_roadmap_skill_options_completed")
      .on(table.completedAt)
      .where(sql`${table.completedAt} IS NOT NULL`),
  ],
);

export const weeklyProgress = pgTable(
  "weekly_progress",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roadmapId: uuid("roadmap_id")
      .notNull()
      .references(() => learningRoadmaps.id, { onDelete: "cascade" }),

    weekNumber: integer("week_number").notNull(),

    hoursSpent: decimal("hours_spent", { precision: 5, scale: 2 })
      .notNull()
      .default("0"),

    skillsCompletedThisWeek: integer("skills_completed_this_week")
      .notNull()
      .default(0),

    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_weekly_progress_roadmap_week").on(
      table.roadmapId,
      table.weekNumber,
    ),
  ],
);

export const learningRoadmapsRelations = relations(
  learningRoadmaps,
  ({ one, many }) => ({
    user: one(users, {
      fields: [learningRoadmaps.userId],
      references: [users.id],
    }),
    phases: many(roadmapPhases),
  }),
);

export const roadmapPhasesRelations = relations(
  roadmapPhases,
  ({ one, many }) => ({
    roadmap: one(learningRoadmaps, {
      fields: [roadmapPhases.roadmapId],
      references: [learningRoadmaps.id],
    }),
    skills: many(roadmapSkills),
  }),
);

export const roadmapSkillsRelations = relations(
  roadmapSkills,
  ({ one, many }) => ({
    phase: one(roadmapPhases, {
      fields: [roadmapSkills.phaseId],
      references: [roadmapPhases.id],
    }),
    options: many(roadmapSkillOptions),
  }),
);

export const roadmapSkillOptionsRelations = relations(
  roadmapSkillOptions,
  ({ one }) => ({
    roadmapSkill: one(roadmapSkills, {
      fields: [roadmapSkillOptions.roadmapSkillId],
      references: [roadmapSkills.id],
    }),
  }),
);

export const weeklyProgressRelations = relations(weeklyProgress, ({ one }) => ({
  roadmap: one(learningRoadmaps, {
    fields: [weeklyProgress.roadmapId],
    references: [learningRoadmaps.id],
  }),
}));

export const skillNotes = pgTable(
  "skill_notes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    roadmapSkillId: uuid("roadmap_skill_id")
      .notNull()
      .references(() => roadmapSkills.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull().default(""),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_skill_notes_skill_user").on(
      table.roadmapSkillId,
      table.userId,
    ),
  ],
);

export const skillNotesRelations = relations(skillNotes, ({ one }) => ({
  roadmapSkill: one(roadmapSkills, {
    fields: [skillNotes.roadmapSkillId],
    references: [roadmapSkills.id],
  }),

  user: one(users, {
    fields: [skillNotes.userId],
    references: [users.id],
  }),
}));

export const optionSubpaths = pgTable(
  "option_subpaths",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    /** FK to roadmap_skill_options.id — null when the subpath belongs to a skill directly */
    optionId: uuid("option_id").references(() => roadmapSkillOptions.id, {
      onDelete: "cascade",
    }),
    /** FK to roadmap_skills.id — used when skill has no options */
    skillId: uuid("skill_id").references(() => roadmapSkills.id, {
      onDelete: "cascade",
    }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description").notNull().default(""),
    duration: varchar("duration", { length: 100 }).notNull().default(""),
    tags: jsonb("tags").$type<string[]>().notNull().default([]),
    ...timestamps,
  },
  (table) => [
    index("idx_option_subpaths_option").on(table.optionId, table.deletedAt),
    index("idx_option_subpaths_skill").on(table.skillId, table.deletedAt),
  ],
);

/** A learning module (subNode) within a subpath */
export const subpathModules = pgTable(
  "subpath_modules",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    subpathId: uuid("subpath_id")
      .notNull()
      .references(() => optionSubpaths.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    description: text("description").notNull().default(""),
    duration: varchar("duration", { length: 100 }).notNull().default(""),
    category: varchar("category", { length: 255 }).notNull().default(""),
    concepts: jsonb("concepts").$type<string[]>().notNull().default([]),
    orderIndex: integer("order_index").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("idx_subpath_modules_subpath_order").on(
      table.subpathId,
      table.deletedAt,
      table.orderIndex,
    ),
  ],
);

/** A resource within a module */
export const subpathResources = pgTable(
  "subpath_resources",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => subpathModules.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 500 }).notNull(),
    url: text("url").notNull().default(""),
    type: varchar("type", { length: 50 })
      .$type<ResourceTypeEnum>()
      .notNull()
      .default(ResourceTypeEnum.ARTICLE),
    description: text("description").notNull().default(""),
    isFree: boolean("is_free").notNull().default(true),
    quickCheck: jsonb("quick_check")
      .$type<
        Array<{
          question: string;
          options: string[];
          correctAnswerIndex: number;
          explanation: string;
        }>
      >()
      .default([]),
    orderIndex: integer("order_index").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("idx_subpath_resources_module_order").on(
      table.moduleId,
      table.deletedAt,
      table.orderIndex,
    ),
  ],
);

/** Quiz questions for a module */
export const subpathQuizQuestions = pgTable(
  "subpath_quiz_questions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => subpathModules.id, { onDelete: "cascade" }),
    question: text("question").notNull(),
    options: jsonb("options").$type<string[]>().notNull(),
    correctAnswerIndex: integer("correct_answer_index").notNull(),
    explanation: text("explanation").notNull().default(""),
    orderIndex: integer("order_index").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("idx_subpath_quiz_module").on(table.moduleId, table.deletedAt),
  ],
);

/** Tracks which resources a user has marked as completed */
export const optionResourceCompletions = pgTable(
  "option_resource_completions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    resourceId: uuid("resource_id")
      .notNull()
      .references(() => subpathResources.id, { onDelete: "cascade" }),
    completedAt: timestamp("completed_at").notNull().defaultNow(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_resource_completions_user_resource").on(
      table.userId,
      table.resourceId,
    ),
  ],
);

/** Saves per-module quiz results for the user */
export const subpathModuleQuizResults = pgTable(
  "subpath_module_quiz_results",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    moduleId: uuid("module_id")
      .notNull()
      .references(() => subpathModules.id, { onDelete: "cascade" }),
    score: integer("score").notNull().default(0),
    totalQuestions: integer("total_questions").notNull().default(0),
    passed: boolean("passed").notNull().default(false),
    attemptedAt: timestamp("attempted_at").notNull().defaultNow(),
    ...timestamps,
  },
  (table) => [
    index("idx_quiz_results_user_module").on(table.userId, table.moduleId),
  ],
);

export const optionSubpathsRelations = relations(
  optionSubpaths,
  ({ one, many }) => ({
    option: one(roadmapSkillOptions, {
      fields: [optionSubpaths.optionId],
      references: [roadmapSkillOptions.id],
    }),
    skill: one(roadmapSkills, {
      fields: [optionSubpaths.skillId],
      references: [roadmapSkills.id],
    }),
    modules: many(subpathModules),
  }),
);

export const subpathModulesRelations = relations(
  subpathModules,
  ({ one, many }) => ({
    subpath: one(optionSubpaths, {
      fields: [subpathModules.subpathId],
      references: [optionSubpaths.id],
    }),
    resources: many(subpathResources),
    quizQuestions: many(subpathQuizQuestions),
  }),
);

export const subpathResourcesRelations = relations(
  subpathResources,
  ({ one }) => ({
    module: one(subpathModules, {
      fields: [subpathResources.moduleId],
      references: [subpathModules.id],
    }),
  }),
);

export const subpathQuizQuestionsRelations = relations(
  subpathQuizQuestions,
  ({ one }) => ({
    module: one(subpathModules, {
      fields: [subpathQuizQuestions.moduleId],
      references: [subpathModules.id],
    }),
  }),
);

export const optionResourceCompletionsRelations = relations(
  optionResourceCompletions,
  ({ one }) => ({
    user: one(users, {
      fields: [optionResourceCompletions.userId],
      references: [users.id],
    }),
    resource: one(subpathResources, {
      fields: [optionResourceCompletions.resourceId],
      references: [subpathResources.id],
    }),
  }),
);

export const subpathModuleQuizResultsRelations = relations(
  subpathModuleQuizResults,
  ({ one }) => ({
    user: one(users, {
      fields: [subpathModuleQuizResults.userId],
      references: [users.id],
    }),
    module: one(subpathModules, {
      fields: [subpathModuleQuizResults.moduleId],
      references: [subpathModules.id],
    }),
  }),
);
