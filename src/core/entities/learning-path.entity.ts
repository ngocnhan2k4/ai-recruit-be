import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  learningRoadmaps,
  roadmapPhases,
  roadmapSkills,
  roadmapSkillOptions,
  weeklyProgress,
  subpaths,
  subpathModules,
  subpathResources,
  subpathQuizQuestions,
  optionResourceCompletions,
  subpathModuleQuizResults,
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
  hasSubpath: boolean;
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
  language?: "vi" | "en";
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

// export interface LearningRoadmapWithEnrichedSkills
//   extends Omit<LearningRoadmap, "currentSkills"> {
//   currentSkills: SkillLevel[];
// }

export interface LearningRoadmapWithDetails extends LearningRoadmap {
  phases: Array<
    RoadmapPhase & {
      skills: Array<RoadmapSkill & { options: RoadmapSkillOptionWithName[] }>;
    }
  >;
  currentWeek?: number;
}

// export interface LearningRoadmapWithDetailsEnriched
//   extends Omit<LearningRoadmapWithDetails, "currentSkills"> {
//   currentSkills: SkillLevel[];
// }

export interface RoadmapProgressStats {
  totalSkills: number;
  completedSkills: number;
  totalPhases: number;
  completedPhases: number;
  overallProgress: number;
  estimatedCompletionDate: Date | null;
}

export interface PreviewRoadmapData {
  gapAnalysis: GapAnalysis;
  totalWeeks: number;
  phases: Array<{
    name: string;
    description: string;
    durationWeeks: number;
    orderIndex: number;
    skills: RoadmapSkillData[];
  }>;
}

export interface AILearningRoadmapResult {
  title: string;
  targetRole: string;
  currentRole: string;
  previewData: PreviewRoadmapData;
  currentSkills: SkillLevel[];
  timeCommitmentHoursPerWeek: number;
}

export type Subpath = InferSelectModel<typeof subpaths>;
export type SubpathModule = InferSelectModel<typeof subpathModules>;
export type SubpathResource = InferSelectModel<typeof subpathResources>;
export type SubpathQuizQuestion = InferSelectModel<typeof subpathQuizQuestions>;
export type OptionResourceCompletion = InferSelectModel<
  typeof optionResourceCompletions
>;
export type SubpathModuleQuizResult = InferSelectModel<
  typeof subpathModuleQuizResults
>;

export interface SubpathWithDetails extends Subpath {
  subNodes: Array<
    SubpathModule & {
      resources: SubpathResource[];
      quizQuestions: SubpathQuizQuestion[];
    }
  >;
}

export interface SubpathGenerateRequest {
  optionName: string;
  optionReason?: string;
  keyConcepts: string[];
  targetRole: string;
  currentRole?: string;
}

export interface AISubpathResult {
  title: string;
  description: string;
  duration: string;
  tags: string[];
  subNodes: Array<{
    title: string;
    description: string;
    duration: string;
    category: string;
    concepts: string[];
    orderIndex: number;
    resources: Array<{
      title: string;
      url: string;
      type: string;
      description: string;
      isFree: boolean;
      orderIndex: number;
      quickCheck: Array<{
        question: string;
        options: string[];
        correctAnswerIndex: number;
        explanation: string;
      }>;
    }>;
    quiz: Array<{
      question: string;
      options: string[];
      correctAnswerIndex: number;
      explanation: string;
      orderIndex: number;
    }>;
  }>;
}
