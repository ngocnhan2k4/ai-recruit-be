import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsString } from "class-validator";

export class RegenerateAtsRawTextDto {
  @ApiProperty({
    description: "Rendered CV HTML content to extract ATS raw text from",
    example:
      '<html><body><div data-cv-template="classic">...</div></body></html>',
  })
  @IsString()
  @IsNotEmpty()
  html: string;
}

export class GetAtsRawTextQueryDto {
  @ApiPropertyOptional({
    description: "Which version of the CV to fetch raw text for",
    enum: ["original", "optimized"],
    example: "optimized",
  })
  @IsIn(["original", "optimized"])
  version: "original" | "optimized";
}
