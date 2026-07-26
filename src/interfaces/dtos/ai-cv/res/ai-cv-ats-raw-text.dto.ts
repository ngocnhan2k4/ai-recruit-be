import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsBoolean, IsOptional, IsString } from "class-validator";

export class AtsRawTextResponseDto {
  @ApiPropertyOptional({ nullable: true })
  @IsString()
  @IsOptional()
  rawText: string | null;

  @ApiPropertyOptional({
    description:
      "Whether this version's raw text is available at all (e.g. false for the original text when the CV wasn't created from an uploaded file)",
  })
  @IsBoolean()
  @IsOptional()
  available?: boolean;

  @ApiProperty({
    description:
      "Whether the returned rawText reflects the current CV content (optimized version only). false means the caller must POST rendered HTML to regenerate it.",
  })
  @IsBoolean()
  cached: boolean;
}
