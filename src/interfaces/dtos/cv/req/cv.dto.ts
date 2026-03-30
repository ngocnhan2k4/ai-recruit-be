import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsOptional, IsNumber, IsUUID } from "class-validator";
import { Transform } from "class-transformer";

export class CvRequestDto {
  @ApiProperty({
    example: "uuid-ai-cv-id",
    required: false,
    description: "Linked AI CV ID",
  })
  @IsOptional()
  @IsUUID()
  aiCvId?: string;

  @ApiProperty({
    example: "My Software Engineer CV.pdf",
    required: false,
    description: "Original filename of the CV file",
  })
  @IsOptional()
  @IsString()
  fileName?: string;

  @ApiProperty({
    example: "My Software Engineer CV",
    required: false,
    description: "Name of the CV",
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: "application/pdf",
    required: false,
    description: "MIME type of the CV file",
  })
  @IsOptional()
  @IsString()
  mimeType?: string;

  @ApiProperty({
    example: 1024000,
    required: false,
    description: "File size in bytes",
  })
  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => (value ? Number(value) : undefined))
  fileSize?: number;
}
