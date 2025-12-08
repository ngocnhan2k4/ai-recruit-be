import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import {
  learningRoadmaps,
  roadmapPhases,
  roadmapSkills,
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

export interface SkillLevel {
  skillId: string;
  level: SkillLevelEnum;
}

export interface Resource {
  title: string;
  type: ResourceTypeEnum;
  url?: string;
  isFree: boolean;
}

export interface DependencyGraph {
  nodes: Array<{ id: string; label: string }>;
  edges: Array<{ from: string; to: string }>;
}

export interface GapAnalysis {
  missingSkills: string[];
  skillsToImprove: string[];
  estimatedDifficulty: GapDifficultyEnum;
}

export interface RoadmapGenerateRequest {
  currentRole?: string;
  targetRole: string;
  timelineWeeks: number;
  timeCommitmentHoursPerWeek: number;
  currentSkills?: SkillLevel[];
}

export interface SkillOption {
  skillId: string;
  skillName: string;
  estimatedHours: number;
  resources: Resource[];
  keyConcepts: string[];
  reason: string;
}

export interface RoadmapPosition {
  positionName: string;
  description: string;
  weekStart: number;
  weekEnd: number;
  orderIndex: number;
  options: SkillOption[];
  prerequisites: string[];
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
    orderIndex: number;
    skills: RoadmapPosition[];
  }>;
  dependencyGraph: DependencyGraph;
}

export interface LearningRoadmapWithDetails extends LearningRoadmap {
  phases: Array<RoadmapPhase & { skills: RoadmapSkill[] }>;
}

export interface RoadmapProgressStats {
  totalSkills: number;
  completedSkills: number;
  totalPhases: number;
  completedPhases: number;
  overallProgress: number;
  estimatedCompletionDate: Date | null;
}
