import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsObject,
  ValidateNested,
  IsEnum,
  IsNotEmpty,
  MinLength,
  IsBoolean,
  IsArray,
} from "class-validator";
import { Type } from "class-transformer";
import {
  SkillLevelEnum,
  ResourceTypeEnum,
  GapDifficultyEnum,
} from "@/core/entities/enum.entity";

class SkillLevelDto {
  @ApiProperty({
    description: "Skill proficiency level",
    example: "intermediate",
  })
  @IsEnum(SkillLevelEnum)
  level: SkillLevelEnum;

  @ApiProperty({
    description: "Confidence level (0-10)",
    example: 7,
  })
  @IsInt()
  @Min(0)
  @Max(10)
  confidence: number;
}

export class GenerateRoadmapRequestDto {
  @ApiPropertyOptional({
    description: "Current job role (optional)",
    example: "Junior Frontend Developer",
  })
  @IsOptional()
  @IsString()
  currentRole?: string;

  @ApiProperty({
    description: "Target job role (required)",
    example: "Senior Full-stack Developer",
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  targetRole: string;

  @ApiProperty({
    description: "Learning timeline in weeks",
    example: 24,
  })
  @IsInt()
  @Min(1)
  @Max(104)
  timelineWeeks: number;

  @ApiProperty({
    description: "Hours per week commitment",
    example: 15,
  })
  @IsInt()
  @Min(1)
  @Max(40)
  timeCommitmentHoursPerWeek: number;

  @ApiPropertyOptional({
    description:
      "Current skills with proficiency levels (optional - có thể null nếu chưa có kỹ năng gì)",
    example: {
      JavaScript: {
        level: "intermediate",
        confidence: 7,
      },
      React: {
        level: "beginner",
        confidence: 5,
      },
    },
  })
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => Object)
  currentSkills?: Record<string, SkillLevelDto>;
}

class ResourceDto {
  @ApiProperty({
    description: "Resource title",
    example: "JavaScript: The Complete Guide",
  })
  @IsString()
  title: string;

  @ApiProperty({
    description: "Resource type",
    example: "course",
  })
  @IsEnum(ResourceTypeEnum)
  type: ResourceTypeEnum;

  @ApiPropertyOptional({
    description: "Resource URL",
    example: "https://www.udemy.com/course/javascript-complete-guide",
  })
  @IsOptional()
  @IsString()
  url?: string;

  @ApiProperty({
    description: "Whether the resource is free",
    example: false,
  })
  @IsBoolean()
  isFree: boolean;
}

export class SkillDto {
  @ApiProperty({
    description: "Unique skill identifier",
    example: "skill-001",
  })
  @IsString()
  skillId: string;

  @ApiProperty({
    description: "Skill name",
    example: "TypeScript Fundamentals",
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Skill description",
    example:
      "Learn TypeScript basics including types, interfaces, and generics",
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: "Estimated hours to learn",
    example: 20,
  })
  @IsInt()
  @Min(1)
  estimatedHours: number;

  @ApiProperty({
    description: "Starting week",
    example: 1,
  })
  @IsInt()
  @Min(1)
  weekStart: number;

  @ApiProperty({
    description: "Ending week",
    example: 3,
  })
  @IsInt()
  @Min(1)
  weekEnd: number;

  @ApiProperty({
    description: "Prerequisite skill IDs",
    example: [],
  })
  @IsArray()
  @IsString({ each: true })
  prerequisites: string[];

  @ApiProperty({
    description: "Learning resources",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceDto)
  resources: ResourceDto[];

  @ApiProperty({
    description: "Key concepts to learn",
    example: ["Types", "Interfaces", "Generics", "Decorators"],
  })
  @IsArray()
  @IsString({ each: true })
  keyConcepts: string[];
}

class PhaseDto {
  @ApiProperty({
    description: "Phase identifier",
    example: "phase-001",
  })
  @IsString()
  phaseId: string;

  @ApiProperty({
    description: "Phase name",
    example: "Foundation Phase",
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Phase description",
    example: "Build a strong foundation in programming fundamentals",
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: "Phase duration in weeks",
    example: 8,
  })
  @IsInt()
  @Min(1)
  durationWeeks: number;

  @ApiProperty({
    description: "Skills in this phase",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillDto)
  skills: SkillDto[];
}

class DependencyEdgeDto {
  @ApiProperty({
    description: "Source skill ID",
    example: "skill-001",
  })
  @IsString()
  fromSkill: string;

  @ApiProperty({
    description: "Target skill ID",
    example: "skill-002",
  })
  @IsString()
  toSkill: string;
}

class DependencyGraphDto {
  @ApiProperty({
    description: "All skill IDs",
    example: ["skill-001", "skill-002", "skill-003"],
  })
  @IsArray()
  @IsString({ each: true })
  nodes: string[];

  @ApiProperty({
    description: "Dependency edges",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DependencyEdgeDto)
  edges: DependencyEdgeDto[];
}

class GapAnalysisDto {
  @ApiProperty({
    description: "Skills not yet acquired",
    example: ["TypeScript", "Node.js", "PostgreSQL"],
  })
  @IsArray()
  @IsString({ each: true })
  missingSkills: string[];

  @ApiProperty({
    description: "Skills needing improvement (có thể rỗng nếu là beginner)",
    example: ["JavaScript", "React"],
  })
  @IsArray()
  @IsString({ each: true })
  skillsToImprove: string[];

  @ApiProperty({
    description: "Overall difficulty",
    example: "medium",
  })
  @IsEnum(GapDifficultyEnum)
  estimatedDifficulty: GapDifficultyEnum;
}

export class GenerateRoadmapResponseDto {
  @ApiProperty({
    description: "Unique roadmap identifier",
    example: "roadmap-12345",
  })
  @IsString()
  roadmapId: string;

  @ApiProperty({
    description: "Generation timestamp (ISO format)",
    example: "2025-11-16T10:30:00Z",
  })
  @IsString()
  generatedAt: string;

  @ApiProperty({
    description: "Skills gap analysis",
  })
  @ValidateNested()
  @Type(() => GapAnalysisDto)
  gapAnalysis: GapAnalysisDto;

  @ApiProperty({
    description: "Total learning duration in weeks",
    example: 24,
  })
  @IsInt()
  totalWeeks: number;

  @ApiProperty({
    description: "Learning phases",
    type: [PhaseDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhaseDto)
  phases: PhaseDto[];

  @ApiProperty({
    description: "Skill dependencies",
    type: DependencyGraphDto,
  })
  @ValidateNested()
  @Type(() => DependencyGraphDto)
  dependencyGraph: DependencyGraphDto;
}
