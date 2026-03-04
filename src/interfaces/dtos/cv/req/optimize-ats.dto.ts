import { CvLanguageEnum } from "@/core";
import type { MultipartFile } from "@fastify/multipart";
import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsString,
  IsEnum,
  IsOptional,
  ValidateNested,
  IsNotEmpty,
} from "class-validator";

export class OptimizeAtsDto {
  @ApiProperty({
    description:
      "Job description to optimize CV against (optional). If provided, performs targeted optimization. If omitted, performs general ATS optimization.",
    example:
      "Looking for Senior Backend Developer with Python, FastAPI, and AWS experience...",
    required: false,
  })
  @IsString()
  @IsOptional()
  jobDescription?: string;

  @ApiProperty({
    description: "CV language",
    enum: CvLanguageEnum,
    default: CvLanguageEnum.VIETNAMESE,
  })
  @IsEnum(CvLanguageEnum)
  @IsOptional()
  language?: CvLanguageEnum;
}

export class OptimizeAtsUploadDto {
  @ApiProperty({
    description: "CV file",
    type: "string",
    format: "binary",
    required: false,
  })
  @IsOptional()
  @IsString()
  file?: MultipartFile;

  @ApiProperty({
    description:
      "Raw CV text content. Provide either 'file' OR 'cvText', not both.",
    example:
      "John Doe\nSenior Backend Developer\nExperience: 5 years with Java, Spring Boot...",
    required: false,
  })
  @IsOptional()
  @IsString()
  cvText?: string;

  @ApiProperty({
    description:
      "JSON string containing optional jobDescription and language. For targeted optimization, include jobDescription. For general optimization, omit it.",
    type: OptimizeAtsDto,
    required: true,
  })
  @ValidateNested()
  @Type(() => OptimizeAtsDto)
  @IsNotEmpty()
  body: OptimizeAtsDto;
}
