import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import type {
  JobCopilotDraft,
  JobCopilotLocale,
  JobCopilotMode,
  JobCopilotRequest,
  JobCopilotAppliedSuggestion,
  JobCopilotBaselineCriterion,
  JobCopilotScoreContext,
  JobQualityCriterionKey,
} from "@/core/entities/job-copilot.entity";

const QUALITY_CRITERIA = [
  "clarity",
  "attractiveness",
  "inclusiveness",
  "completeness",
  "consistency",
] as const;

export class JobCopilotDraftDto implements JobCopilotDraft {
  @ApiProperty({ example: "Senior Frontend Engineer" })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  title: string;

  @ApiProperty({ example: "Frontend Developer" })
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  category: string;

  @ApiProperty({
    required: false,
    example: "Bảo trì và hiện đại hóa hệ thống legacy .NET",
  })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  roleContext?: string;

  @ApiProperty({ required: false, example: 4 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  experienceMin?: number;

  @ApiProperty({ required: false, example: 6 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(50)
  experienceMax?: number;

  @ApiProperty({ example: "hybrid" })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  workType: string;

  @ApiProperty({ type: [String], example: ["TP. Hồ Chí Minh"] })
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  locations: string[];

  @ApiProperty({ type: [String], example: ["React", "TypeScript"] })
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  skills: string[];

  @ApiProperty({ required: false, example: 25000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMin?: number;

  @ApiProperty({ required: false, example: 35000000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  salaryMax?: number;

  @ApiProperty({ enum: ["VND"], default: "VND" })
  @IsIn(["VND"])
  salaryCurrency: "VND";

  @ApiProperty({ enum: ["million"], default: "million" })
  @IsIn(["million"])
  salaryUnit: "million";

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  requirements?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  @MaxLength(20000)
  benefits?: string;
}

export class JobCopilotBaselineCriterionDto
  implements JobCopilotBaselineCriterion
{
  @ApiProperty({ enum: QUALITY_CRITERIA })
  @IsIn(QUALITY_CRITERIA)
  key: JobQualityCriterionKey;

  @ApiProperty()
  @IsInt()
  @Min(0)
  score: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  maxScore: number;
}

export class JobCopilotAppliedSuggestionDto
  implements JobCopilotAppliedSuggestion
{
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  id: string;

  @ApiProperty({ enum: QUALITY_CRITERIA })
  @IsIn(QUALITY_CRITERIA)
  criterionKey: JobQualityCriterionKey;

  @ApiProperty()
  @IsInt()
  @Min(0)
  @Max(100)
  scoreGain: number;
}

export class JobCopilotScoreContextDto implements JobCopilotScoreContext {
  @ApiProperty({ type: [JobCopilotBaselineCriterionDto] })
  @IsArray()
  @ArrayMinSize(5)
  @ArrayMaxSize(5)
  @ValidateNested({ each: true })
  @Type(() => JobCopilotBaselineCriterionDto)
  baselineCriteria: JobCopilotBaselineCriterionDto[];

  @ApiProperty({ type: [JobCopilotAppliedSuggestionDto] })
  @IsArray()
  @ArrayMaxSize(8)
  @ValidateNested({ each: true })
  @Type(() => JobCopilotAppliedSuggestionDto)
  appliedSuggestions: JobCopilotAppliedSuggestionDto[];
}

export class JobCopilotRequestDto implements JobCopilotRequest {
  @ApiProperty({ enum: ["generate", "review"] })
  @IsIn(["generate", "review"])
  mode: JobCopilotMode;

  @ApiProperty({ enum: ["vi", "en"], default: "vi" })
  @IsIn(["vi", "en"])
  locale: JobCopilotLocale;

  @ApiProperty({ type: JobCopilotDraftDto })
  @ValidateNested()
  @Type(() => JobCopilotDraftDto)
  draft: JobCopilotDraftDto;

  @ApiProperty({ required: false, type: JobCopilotScoreContextDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => JobCopilotScoreContextDto)
  scoreContext?: JobCopilotScoreContextDto;
}
