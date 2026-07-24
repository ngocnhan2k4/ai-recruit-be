import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
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
} from "@/core/entities/job-copilot.entity";

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
}
