import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  learningRoadmaps,
  roadmapPhases,
  roadmapSkills,
  roadmapSkillOptions,
  weeklyProgress,
} from "@/frameworks/data-services/postgres/models";
import {
  SkillLevelEnum,
  ResourceTypeEnum,
  GapDifficultyEnum,
} from "./enum.entity";

export type NewLearningRoadmap = InferInsertModel<typeof learningRoadmaps>;
export type LearningRoadmap = InferSelectModel<typeof learningRoadmaps>;

export type NewRoadmapPhase = InferInsertModel<typeof roadmapPhases>;
export type RoadmapPhase = InferSelectModel<typeof roadmapPhases>;

export type NewRoadmapSkill = InferInsertModel<typeof roadmapSkills>;
export type RoadmapSkill = InferSelectModel<typeof roadmapSkills>;

export type NewRoadmapSkillOption = InferInsertModel<
  typeof roadmapSkillOptions
>;
export type RoadmapSkillOption = InferSelectModel<typeof roadmapSkillOptions>;

export type NewWeeklyProgress = InferInsertModel<typeof weeklyProgress>;
export type WeeklyProgress = InferSelectModel<typeof weeklyProgress>;

export interface RoadmapSkillOptionWithName extends RoadmapSkillOption {
  optionName: string;
  proficiencyLevels: {
    beginner?: {
      summary: string;
      criteria: string[];
    };
    intermediate?: {
      summary: string;
      criteria: string[];
    };
    advanced?: {
      summary: string;
      criteria: string[];
    };
  } | null;
}

export interface SkillLevel {
  skillId: string;
  level: SkillLevelEnum;
  skillName?: string;
}

export interface Resource {
  title: string;
  type: ResourceTypeEnum;
  url?: string;
  isFree: boolean;
}

export interface GapAnalysis {
  missingSkills: string[];
  skillsToImprove: string[];
  estimatedDifficulty: GapDifficultyEnum;
}

export interface RoadmapGenerateRequest {
  currentRole?: string;
  targetRole: string;
  timeCommitmentHoursPerWeek: number;
  currentSkills?: SkillLevel[];
}

export interface SkillOption {
  optionId: string;
  optionName: string;
  resources: Resource[];
  keyConcepts: string[];
}

export interface RoadmapSkillData {
  skillId?: string;
  skill: string;
  description: string;
  weekStart: number;
  weekEnd: number;
  orderIndex: number;
  prerequisites: string[];
  options: SkillOption[];
}

export interface PreviewRoadmapResponse {
  roadmapId: string;
  generatedAt: string;
  gapAnalysis: GapAnalysis;
  totalWeeks: number;
  phases: Array<{
    name: string;
    description: string;
    durationWeeks: number;
    skills: RoadmapSkillData[];
  }>;
}

export interface LearningRoadmapWithEnrichedSkills
  extends Omit<LearningRoadmap, "currentSkills"> {
  currentSkills: SkillLevel[];
}

export interface LearningRoadmapWithDetails extends LearningRoadmap {
  phases: Array<
    RoadmapPhase & {
      skills: Array<RoadmapSkill & { options: RoadmapSkillOptionWithName[] }>;
    }
  >;
}

export interface LearningRoadmapWithDetailsEnriched
  extends Omit<LearningRoadmapWithDetails, "currentSkills"> {
  currentSkills: SkillLevel[];
}

export interface RoadmapProgressStats {
  totalSkills: number;
  completedSkills: number;
  totalPhases: number;
  completedPhases: number;
  overallProgress: number;
  estimatedCompletionDate: Date | null;
}
