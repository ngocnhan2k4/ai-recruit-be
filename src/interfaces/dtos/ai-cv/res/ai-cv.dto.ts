import { CvLanguageEnum, CvTemplateEnum } from "@/core";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { OptimizedCvDataDto } from "./ai-cv-base.dto";

export class AiCvDto {
  @ApiProperty({ example: "uuid-v4" })
  @IsUUID()
  id: string;

  @ApiProperty({ example: "user-uuid-v4" })
  @IsUUID()
  userId: string;

  @ApiProperty({ example: "My Optimized CV V1" })
  @IsString()
  title: string;

  @ApiPropertyOptional({ example: "Frontend Developer", nullable: true })
  @IsString()
  @IsOptional()
  targetJobTitle: string | null;

  @ApiPropertyOptional({ type: OptimizedCvDataDto })
  @ValidateNested()
  @Type(() => OptimizedCvDataDto)
  cvData: OptimizedCvDataDto;

  @ApiPropertyOptional({ type: OptimizedCvDataDto, nullable: true })
  @ValidateNested()
  @Type(() => OptimizedCvDataDto)
  @IsOptional()
  editedCvData?: OptimizedCvDataDto | null;

  @ApiPropertyOptional({ example: 70, nullable: true })
  @IsNumber()
  @IsOptional()
  originalAtsScore?: number | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  originalScoreBreakdown?: Record<string, any> | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  scoreBreakdown?: Record<string, any> | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  optimizationsApplied?: Record<string, any>[] | null;

  @ApiPropertyOptional({ example: 85, nullable: true })
  @IsNumber()
  @IsOptional()
  atsScore: number | null;

  @ApiPropertyOptional({
    example: ["React", "TypeScript"],
    nullable: true,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  matchingSkills: string[] | null;

  @ApiPropertyOptional({
    example: ["AWS", "Docker"],
    nullable: true,
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  missingSkills: string[] | null;

  @ApiPropertyOptional({
    example: "Consider adding more cloud experience...",
    nullable: true,
  })
  @IsString()
  @IsOptional()
  recommendation: string | null;

  @ApiPropertyOptional({ example: "Job description text...", nullable: true })
  @IsString()
  @IsOptional()
  jobDescription: string | null;

  @ApiPropertyOptional({ example: "original.pdf", nullable: true })
  @IsString()
  @IsOptional()
  originalCvFilename: string | null;

  @ApiProperty({ enum: CvLanguageEnum, example: "en" })
  language: CvLanguageEnum;

  @ApiProperty({ example: false })
  @IsBoolean()
  isFavorite: boolean;

  @ApiProperty({ enum: CvTemplateEnum, example: CvTemplateEnum.CLASSIC })
  template: CvTemplateEnum;

  @ApiProperty()
  @IsDate()
  @Type(() => Date)
  createdAt: Date;

  @ApiPropertyOptional({ nullable: true })
  @IsDate()
  @IsOptional()
  @Type(() => Date)
  updatedAt: Date | null;
}

export class AiCvListResponseDto {
  @ApiProperty({
    type: [AiCvDto],
    description: "Array of user CVs",
  })
  aiCvs: AiCvDto[];
}
