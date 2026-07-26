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
      "Always true — kept for API compatibility. The ATS text is now generated directly from the CV's structured data on every request, so there is no cache-miss case.",
  })
  @IsBoolean()
  cached: boolean;
}
