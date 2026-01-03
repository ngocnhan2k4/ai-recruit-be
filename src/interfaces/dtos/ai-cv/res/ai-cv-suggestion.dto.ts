import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

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
