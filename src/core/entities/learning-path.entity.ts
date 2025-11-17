import {
  SkillLevelEnum,
  ResourceTypeEnum,
  GapDifficultyEnum,
} from "./enum.entity";

interface SkillLevel {
  level: SkillLevelEnum;
  confidence: number; // 0-10
}

interface Resource {
  title: string;
  type: ResourceTypeEnum;
  url?: string;
  isFree: boolean;
}

interface Skill {
  skillId: string;
  name: string;
  description: string;
  estimatedHours: number;
  weekStart: number;
  weekEnd: number;
  prerequisites: string[];
  resources: Resource[];
  keyConcepts: string[];
}

interface Phase {
  phaseId: string;
  name: string;
  description: string;
  durationWeeks: number;
  skills: Skill[];
}

interface DependencyEdge {
  fromSkill: string;
  toSkill: string;
}

interface DependencyGraph {
  nodes: string[];
  edges: DependencyEdge[];
}

interface GapAnalysis {
  missingSkills: string[];
  skillsToImprove: string[];
  estimatedDifficulty: GapDifficultyEnum;
}

export interface RoadmapGenerate {
  currentRole?: string;
  targetRole: string;
  timelineWeeks: number;
  timeCommitmentHoursPerWeek: number;
  currentSkills?: Record<string, SkillLevel>;
}

export interface GeneratedRoadmap {
  roadmapId: string;
  generatedAt: string;
  gapAnalysis: GapAnalysis;
  totalWeeks: number;
  phases: Phase[];
  dependencyGraph: DependencyGraph;
}
