import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  jsonb,
  timestamp,
  decimal,
} from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";
import { users } from "./user.model";
import { relations } from "drizzle-orm";
import { GapDifficultyEnum, ResourceTypeEnum, SkillLevelEnum } from "@/core";

export const learningRoadmaps = pgTable("learning_roadmaps", {
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

  overallProgress: decimal("overall_progress", { precision: 5, scale: 2 })
    .notNull()
    .default("0"),
  ...timestamps,
});

export const roadmapPhases = pgTable("roadmap_phases", {
  id: uuid("id").defaultRandom().primaryKey(),
  roadmapId: uuid("roadmap_id")
    .notNull()
    .references(() => learningRoadmaps.id, { onDelete: "cascade" }),

  name: varchar("name", { length: 255 }).notNull(),
  description: text("description").notNull(),
  durationWeeks: integer("duration_weeks").notNull(),
  orderIndex: integer("order_index").notNull(),

  completedAt: timestamp("completed_at"),

  ...timestamps,
});

export const roadmapSkills = pgTable("roadmap_skills", {
  id: uuid("id").defaultRandom().primaryKey(),
  phaseId: uuid("phase_id")
    .notNull()
    .references(() => roadmapPhases.id, { onDelete: "cascade" }),

  skill: varchar("skill", { length: 500 }).notNull(),
  description: text("description").notNull(),

  weekStart: integer("week_start").notNull(),
  weekEnd: integer("week_end").notNull(),
  orderIndex: integer("order_index").notNull(),

  prerequisites: jsonb("prerequisites").$type<string[]>().notNull().default([]),

  ...timestamps,
});

export const roadmapSkillOptions = pgTable("roadmap_skill_options", {
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
});

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
