import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsIn,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { OptimizedCvDataDto } from "../res/ai-cv-base.dto";

export class CvFieldContextDto {
  @ApiPropertyOptional({
    example: 0,
    description: "Index of the item in array (for experience.*, projects.*)",
  })
  @IsOptional()
  index?: number;

  @ApiPropertyOptional({ example: "Senior Backend Developer" })
  @IsString()
  @IsOptional()
  position?: string;

  @ApiPropertyOptional({ example: "Tech Corp" })
  @IsString()
  @IsOptional()
  company?: string;

  @ApiPropertyOptional({ example: "E-commerce Platform" })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: "Built with Spring Boot and React" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    example: ["Spring Boot", "React", "PostgreSQL"],
    type: [String],
  })
  @IsOptional()
  technologies?: string[];

  [key: string]: any;
}

export class CvFieldSuggestionRequestDto {
  @ApiProperty({
    type: OptimizedCvDataDto,
    description: "The full CV data object",
  })
  @ValidateNested()
  @Type(() => OptimizedCvDataDto)
  @IsNotEmpty()
  cvData: OptimizedCvDataDto;

  @ApiProperty({
    example: "summary",
    description:
      "Which field to get suggestion for. Valid values: targetJobTitle, summary, experience.position, experience.achievements, skills.technical, skills.soft, projects.description, projects.technologies",
  })
  @IsString()
  @IsNotEmpty()
  targetField: string;

  @ApiPropertyOptional({
    type: CvFieldContextDto,
    description:
      "Context for array items (required for experience.* and projects.* fields). Must include 'index' property.",
    nullable: true,
  })
  @ValidateNested()
  @Type(() => CvFieldContextDto)
  @IsObject()
  @IsOptional()
  fieldContext?: CvFieldContextDto | null;

  @ApiPropertyOptional({
    example: "We are looking for a Senior Backend Developer...",
    description: "Target job description (optional, for better suggestions)",
    nullable: true,
  })
  @IsString()
  @IsOptional()
  jobDescription?: string | null;
}

export class LogSuggestionDecisionDto {
  @ApiProperty({
    example: "summary",
    description: "The field the suggestion was for",
  })
  @IsString()
  @IsNotEmpty()
  targetField: string;

  @ApiProperty({
    example: "update",
    description: "'update' (replace) or 'add' (append new item)",
    enum: ["update", "add"],
  })
  @IsIn(["update", "add"])
  action: "update" | "add";

  @ApiPropertyOptional({
    example: "Junior Developer with 1 year of experience.",
    description: "Current value; null for 'add' actions",
    nullable: true,
  })
  @IsOptional()
  originalText?: string | null;

  @ApiProperty({
    example:
      "Experienced Full-Stack Developer with 3+ years of expertise in React and Node.js...",
    description: "The candidate value/item that was reviewed",
  })
  @IsString()
  @IsNotEmpty()
  suggestedText: string;

  @ApiProperty({
    example:
      "Emphasizes leadership and quantified impact, matching the JD's seniority level.",
    description: "Why this candidate was suggested",
  })
  @IsString()
  reasoning: string;

  @ApiProperty({
    example: "accepted",
    description: "The user's decision on this suggestion",
    enum: ["accepted", "rejected"],
  })
  @IsIn(["accepted", "rejected"])
  decision: "accepted" | "rejected";
}
