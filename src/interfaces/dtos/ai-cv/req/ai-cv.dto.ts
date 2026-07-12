import { CvLanguageEnum, CvTemplateEnum } from "@/core";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { OptimizedCvDataDto } from "../res/ai-cv-base.dto";

export class AiCvRequestDto {
  @ApiProperty({
    example: "My Optimized CV for Backend Dev",
    description: "The display title of the CV",
  })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({
    example: "Senior Backend Engineer",
    description: "The specific job title this CV targets",
  })
  @IsString()
  @IsOptional()
  targetJobTitle?: string;

  @ApiProperty({
    type: OptimizedCvDataDto,
    description: "The structured JSON data of the CV",
  })
  @ValidateNested()
  @Type(() => OptimizedCvDataDto)
  @IsNotEmpty()
  cvData: OptimizedCvDataDto;

  @ApiPropertyOptional({
    example: 85,
    description: "The calculated ATS score (0-100)",
    minimum: 0,
    maximum: 100,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  atsScore?: number;

  @ApiPropertyOptional({
    example: ["Java", "Spring Boot", "Docker"],
    type: [String],
    description: "Skills from the CV that matched the job description",
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  matchingSkills?: string[];

  @ApiPropertyOptional({
    example: ["Kubernetes", "AWS"],
    type: [String],
    description: "Skills required by the job but missing from the CV",
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  missingSkills?: string[];

  @ApiPropertyOptional({
    example:
      "Consider highlighting your cloud infrastructure experience more...",
    description: "AI-generated advice for improvement",
  })
  @IsString()
  @IsOptional()
  recommendation?: string;

  @ApiPropertyOptional({
    example: "We are looking for a Senior Java Developer...",
    description: "The original job description text used for optimization",
  })
  @IsString()
  @IsOptional()
  jobDescription?: string;

  @ApiPropertyOptional({
    example: "my_original_resume.pdf",
    description: "Filename of the uploaded source CV",
  })
  @IsString()
  @IsOptional()
  originalCvFilename?: string;

  @ApiPropertyOptional({
    enum: CvLanguageEnum,
    example: CvLanguageEnum.VIETNAMESE,
    default: CvLanguageEnum.VIETNAMESE,
  })
  @IsEnum(CvLanguageEnum)
  @IsOptional()
  language?: CvLanguageEnum;

  @ApiPropertyOptional({
    example: false,
    default: false,
    description: "Whether to mark this CV as a favorite",
  })
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;

  @ApiPropertyOptional({
    enum: CvTemplateEnum,
    example: CvTemplateEnum.CLASSIC,
    default: CvTemplateEnum.CLASSIC,
    description: "CV template to use for rendering",
  })
  @IsEnum(CvTemplateEnum)
  @IsOptional()
  template?: CvTemplateEnum;
}
