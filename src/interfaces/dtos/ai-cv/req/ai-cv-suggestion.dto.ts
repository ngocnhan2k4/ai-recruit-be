import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
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
