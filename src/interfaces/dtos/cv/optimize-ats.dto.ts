import { CvLanguageEnum } from "@/core";
import type { MultipartFile } from "@fastify/multipart";
import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsEnum, IsOptional } from "class-validator";

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
  file: MultipartFile;
  body: OptimizeAtsDto;
}
