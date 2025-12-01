import { CvLanguageEnum } from "@/core";
import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsEnum, IsOptional } from "class-validator";

export class OptimizeAtsDto {
  @ApiProperty({
    description: "Job description to optimize CV against",
    example:
      "Looking for Senior Backend Developer with Python, FastAPI, and AWS experience...",
  })
  @IsString()
  jobDescription: string;

  @ApiProperty({
    description: "CV language",
    enum: CvLanguageEnum,
    default: CvLanguageEnum.VIETNAMESE,
  })
  @IsEnum(CvLanguageEnum)
  @IsOptional()
  language?: CvLanguageEnum;
}

export class OptimizeAtsUploadDto extends OptimizeAtsDto {
  @ApiProperty({
    type: "string",
    format: "binary",
    description: "CV file (PDF or DOCX, max 5MB)",
  })
  cvFile: any;
}
