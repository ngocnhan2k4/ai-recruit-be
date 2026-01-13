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
import { GeneralQueryDto } from "../../common/query";
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

export class GetRoadmapsQueryDto extends GeneralQueryDto {}

export class CompleteSkillDto {
  @ApiProperty({
    description: "Skill option ID to mark as completed",
    example: "550e8400-e29b-41d4-a716-446655440000",
  })
  @IsUUID()
  optionId: string;
}
