import { ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, ValidateNested } from "class-validator";
import { AiCvRequestDto } from "./ai-cv.dto";
import {
  CvCertificateDto,
  CvPersonalInfoDto,
  OptimizedCvDataDto,
} from "../res/ai-cv-base.dto";

export class UpdateCvPersonalInfoDto extends PartialType(CvPersonalInfoDto) {}

export class UpdateCvCertificateDto extends PartialType(CvCertificateDto) {}

export class UpdateOptimizedCvDataDto extends PartialType(OptimizedCvDataDto) {}

export class UpdateAiCvDto extends PartialType(
  OmitType(AiCvRequestDto, ["cvData"] as const),
) {
  @ApiPropertyOptional({
    type: UpdateOptimizedCvDataDto,
    description: "The structured JSON data of the CV",
  })
  @ValidateNested()
  @Type(() => UpdateOptimizedCvDataDto)
  @IsOptional()
  cvData?: UpdateOptimizedCvDataDto;
}
