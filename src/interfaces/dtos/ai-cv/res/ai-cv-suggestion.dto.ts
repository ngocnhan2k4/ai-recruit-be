import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsArray, IsIn, IsString, ValidateNested } from "class-validator";

export class CvFieldSuggestionResponseDto {
  @ApiProperty({
    example: "summary",
    description: "The field that was requested",
  })
  @IsString()
  targetField: string;

  @ApiProperty({
    example:
      "Experienced Full-Stack Developer with 3+ years of expertise in React and Node.js...",
    description: "Single suggestion as raw string",
  })
  @IsString()
  suggestion: string;

  @ApiProperty({
    example: "2025-12-21T07:00:00.000Z",
    description: "ISO timestamp when the suggestion was generated",
  })
  @IsString()
  generatedAt: string;
}

export class SuggestionChunkDto {
  @ApiProperty({
    example: "update",
    description: "'update' (replace) or 'add' (append new item)",
    enum: ["update", "add"],
  })
  @IsIn(["update", "add"])
  action: "update" | "add";

  @ApiProperty({
    example: "Junior Developer with 1 year of experience.",
    description: "Current value; null for 'add' actions",
    nullable: true,
  })
  originalText: string | null;

  @ApiProperty({
    example:
      "Experienced Full-Stack Developer with 3+ years of expertise in React and Node.js...",
    description: "The candidate value/item",
  })
  @IsString()
  suggestedText: string;

  @ApiProperty({
    example:
      "Emphasizes leadership and quantified impact, matching the JD's seniority level.",
    description: "Why this candidate improves the CV/ATS fit",
  })
  @IsString()
  reasoning: string;
}

export class CvFieldSuggestionResponseV2Dto {
  @ApiProperty({
    example: "summary",
    description: "The field that was requested",
  })
  @IsString()
  targetField: string;

  @ApiProperty({
    type: [SuggestionChunkDto],
    description: "2-3 candidate suggestions with reasoning",
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SuggestionChunkDto)
  suggestions: SuggestionChunkDto[];

  @ApiProperty({
    example: "2025-12-21T07:00:00.000Z",
    description: "ISO timestamp when the suggestions were generated",
  })
  @IsString()
  generatedAt: string;
}
