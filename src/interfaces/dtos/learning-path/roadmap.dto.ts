import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsInt,
  IsOptional,
  IsUUID,
  IsArray,
  ValidateNested,
  IsEnum,
  IsNotEmpty,
  Min,
  Max,
} from "class-validator";
import { Type } from "class-transformer";
import { GeneralQueryDto } from "../common/query";
import { SkillLevelEnum } from "@/core/entities/enum.entity";

export class SkillLevelDto {
  @ApiProperty({
    description: "Skill ID from database",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  skillId: string;

  @ApiProperty({
    description: "Skill proficiency level",
    example: "intermediate",
    enum: SkillLevelEnum,
  })
  @IsEnum(SkillLevelEnum)
  level: SkillLevelEnum;
}

export class PreviewRoadmapDto {
  @ApiPropertyOptional({
    description: "Current job role",
    example: "Junior Frontend Developer",
  })
  @IsOptional()
  @IsString()
  currentRole?: string;

  @ApiProperty({
    description: "Target job role",
    example: "Senior Full-stack Developer",
  })
  @IsString()
  @IsNotEmpty()
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
    description: "Current skills with proficiency levels",
    type: [SkillLevelDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillLevelDto)
  currentSkills?: SkillLevelDto[];
}

export class SaveRoadmapDto {
  @ApiProperty({
    description: "Roadmap title",
    example: "My Journey to Senior Full-stack Developer",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    description: "Current job role",
    example: "Junior Frontend Developer",
  })
  @IsOptional()
  @IsString()
  currentRole?: string;

  @ApiProperty({
    description: "Target job role",
    example: "Senior Full-stack Developer",
  })
  @IsString()
  @IsNotEmpty()
  targetRole: string;

  @ApiProperty({
    description: "Learning timeline in weeks",
    example: 24,
  })
  @IsInt()
  timelineWeeks: number;

  @ApiProperty({
    description: "Hours per week commitment",
    example: 15,
  })
  @IsInt()
  timeCommitmentHoursPerWeek: number;

  @ApiPropertyOptional({
    description: "Current skills with proficiency levels",
    type: [SkillLevelDto],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SkillLevelDto)
  currentSkills?: SkillLevelDto[];

  @ApiProperty({
    description:
      "Preview roadmap response from /preview endpoint (complete JSON)",
  })
  @IsNotEmpty()
  previewData: any; // Will accept the full PreviewRoadmapResponse
}

export class GetRoadmapsQueryDto extends GeneralQueryDto {
  @ApiPropertyOptional({
    description: "Filter by user ID (admin only)",
  })
  @IsOptional()
  @IsUUID()
  userId?: string;
}

export class CompleteSkillDto {
  @ApiProperty({
    description: "Roadmap skill ID to mark as completed",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  skillId: string;
}

export class RoadmapProgressStatsDto {
  @ApiProperty({
    description:
      "Total number of learning positions in roadmap (each position can have multiple skill options)",
    example: 8,
  })
  totalSkills: number;

  @ApiProperty({
    description:
      "Number of completed positions (a position is completed when user completes at least one skill option from it)",
    example: 3,
  })
  completedSkills: number;

  @ApiProperty({
    description: "Total number of phases",
    example: 5,
  })
  totalPhases: number;

  @ApiProperty({
    description: "Number of completed phases",
    example: 2,
  })
  completedPhases: number;

  @ApiProperty({
    description: "Overall progress percentage (0-100)",
    example: 48.5,
  })
  overallProgress: number;

  @ApiProperty({
    description: "Estimated completion date",
    example: "2026-03-15T00:00:00.000Z",
    nullable: true,
  })
  estimatedCompletionDate: Date | null;
}
