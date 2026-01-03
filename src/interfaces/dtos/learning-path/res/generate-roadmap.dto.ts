import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsInt,
  IsArray,
  ValidateNested,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import {
  ResourceTypeEnum,
  GapDifficultyEnum,
  PhaseStatusEnum,
} from "@/core/entities/enum.entity";

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

  @ApiProperty({
    description: "Resource URL",
    example: "https://www.udemy.com/course/javascript-complete-guide",
    required: false,
  })
  url?: string;

  @ApiProperty({
    description: "Whether the resource is free",
    example: false,
  })
  isFree: boolean;
}

export class SkillOptionDto {
  @ApiProperty({
    description: "Unique skill identifier",
    example: "21bbc963-d284-40ab-884d-da539e9c011b",
  })
  @IsString()
  skillId: string;

  @ApiProperty({
    description: "Skill name",
    example: "Go",
  })
  @IsString()
  skillName: string;

  @ApiProperty({
    description: "Estimated hours to learn",
    example: 45,
  })
  @IsInt()
  estimatedHours: number;

  @ApiProperty({
    description: "Learning resources",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResourceDto)
  resources: ResourceDto[];

  @ApiProperty({
    description: "Key concepts to learn",
    example: ["Goroutines & Channels", "Interfaces & Struct embedding"],
  })
  @IsArray()
  @IsString({ each: true })
  keyConcepts: string[];

  @ApiProperty({
    description: "Reason why this skill is recommended",
    example:
      "Hiệu năng cao, cú pháp đơn giản, mạnh mẽ cho lập trình đồng thời và microservices.",
  })
  @IsString()
  reason: string;
}

export class RoadmapPositionDto {
  @ApiProperty({
    description: "AI-generated skill UUID for mapping prerequisites",
    example: "a1b2c3d4-e5f6-7890-abcd-ef1234567891",
    required: false,
  })
  @IsString()
  skillId?: string;

  @ApiProperty({
    description: "Position name (learning objective)",
    example: "Lập trình Backend Nâng cao",
  })
  @IsString()
  positionName: string;

  @ApiProperty({
    description: "Position description",
    example:
      "Nắm vững các khái niệm nâng cao của ngôn ngữ lập trình và các mẫu thiết kế...",
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: "Starting week",
    example: 1,
  })
  @IsInt()
  weekStart: number;

  @ApiProperty({
    description: "Ending week",
    example: 3,
  })
  @IsInt()
  weekEnd: number;

  @ApiProperty({
    description: "Order index in the phase",
    example: 0,
  })
  @IsInt()
  orderIndex: number;

  @ApiProperty({
    description: "Available skill options for this position",
    type: [SkillOptionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillOptionDto)
  options: SkillOptionDto[];

  @ApiProperty({
    description: "Prerequisite skill IDs",
    example: ["a1b2c3d4-e5f6-7890-abcd-ef1234567891"],
  })
  @IsArray()
  @IsString({ each: true })
  prerequisites: string[];
}

class PhaseDto {
  @ApiProperty({
    description: "Phase name",
    example: "Giai đoạn Nền tảng",
  })
  @IsString()
  name: string;

  @ApiProperty({
    description: "Phase description",
    example:
      "Tập trung vào việc đào sâu kiến thức cốt lõi về ngôn ngữ, cơ sở dữ liệu...",
  })
  @IsString()
  description: string;

  @ApiProperty({
    description: "Phase duration in weeks",
    example: 8,
  })
  @IsInt()
  durationWeeks: number;

  @ApiProperty({
    description: "Order index of the phase",
    example: 0,
  })
  @IsInt()
  orderIndex: number;

  @ApiProperty({
    description: "Phase progress percentage (0-100)",
    example: 75.5,
    required: false,
  })
  progress?: number;

  @ApiProperty({
    description: "Phase status",
    example: PhaseStatusEnum.IN_PROGRESS,
    enum: PhaseStatusEnum,
    required: false,
  })
  @IsEnum(PhaseStatusEnum)
  status?: PhaseStatusEnum;

  @ApiProperty({
    description: "When the phase was started",
    example: "2025-12-01T10:00:00.000Z",
    required: false,
  })
  startedAt?: Date;

  @ApiProperty({
    description: "When the phase was completed",
    example: "2025-12-15T18:30:00.000Z",
    required: false,
  })
  completedAt?: Date;

  @ApiProperty({
    description: "Learning positions in this phase",
    type: [RoadmapPositionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RoadmapPositionDto)
  skills: RoadmapPositionDto[];
}

class DependencyNodeDto {
  @ApiProperty({
    description: "Skill ID",
    example: "21bbc963-d284-40ab-884d-da539e9c011b",
  })
  @IsString()
  id: string;

  @ApiProperty({
    description: "Skill label/name",
    example: "Go",
  })
  @IsString()
  label: string;
}

class DependencyEdgeDto {
  @ApiProperty({
    description: "Source skill ID",
    example: "21bbc963-d284-40ab-884d-da539e9c011b",
  })
  @IsString()
  from: string;

  @ApiProperty({
    description: "Target skill ID",
    example: "18c2617a-8da1-4bc0-b574-d29e18290f91",
  })
  @IsString()
  to: string;
}

class DependencyGraphDto {
  @ApiProperty({
    description: "All skill nodes",
    type: [DependencyNodeDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DependencyNodeDto)
  nodes: DependencyNodeDto[];

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
    example: "8848c1da-beb1-4bba-b355-a4751100d4b2",
  })
  @IsString()
  roadmapId: string;

  @ApiProperty({
    description: "Generation timestamp (ISO format)",
    example: "2025-12-07T14:29:02.355338+00:00",
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
    description: "Learning phases with skill positions",
    type: [PhaseDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PhaseDto)
  phases: PhaseDto[];

  @ApiProperty({
    description: "Skill dependencies graph",
    type: DependencyGraphDto,
  })
  @ValidateNested()
  @Type(() => DependencyGraphDto)
  dependencyGraph: DependencyGraphDto;
}
