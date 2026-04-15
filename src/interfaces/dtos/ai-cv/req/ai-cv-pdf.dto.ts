import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsNotEmpty, IsNumber, IsOptional, IsString } from "class-validator";

export class GenerateCvPdfRequestDto {
  @ApiProperty({
    description: "Rendered CV HTML content to convert into PDF",
    example:
      '<html><body><div data-cv-template="classic">...</div></body></html>',
  })
  @IsString()
  @IsNotEmpty()
  html: string;

  @ApiPropertyOptional({
    description: "Preferred PDF root width in pixels",
    example: 900,
  })
  @IsNumber()
  @IsOptional()
  pdfWidth?: number;
}
