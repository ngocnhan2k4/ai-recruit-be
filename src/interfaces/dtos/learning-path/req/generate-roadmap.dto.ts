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
} from "class-validator";
import { Type } from "class-transformer";
import { SkillLevelEnum } from "@/core/entities/enum.entity";

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
