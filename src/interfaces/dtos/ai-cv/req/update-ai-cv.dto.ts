import { ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsString, ValidateNested } from "class-validator";
import { AiCvRequestDto } from "./ai-cv.dto";
import {
  CvCertificateDto,
  CvPersonalInfoDto,
  OptimizedCvDataDto,
} from "../res/ai-cv-base.dto";

export class UpdateCvPersonalInfoDto extends PartialType(
  OmitType(CvPersonalInfoDto, ["email"] as const),
) {
  @ApiPropertyOptional({ example: "dev@example.com" })
  @IsString()
  @IsOptional()
  email?: string;
}

export class UpdateCvCertificateDto extends PartialType(
  OmitType(CvCertificateDto, ["issuer"] as const),
) {
  @ApiPropertyOptional({ example: "Amazon Web Services" })
  @IsString()
  @IsOptional()
  issuer?: string;
}

export class UpdateOptimizedCvDataDto extends PartialType(
  OmitType(OptimizedCvDataDto, ["personalInfo", "certificates"] as const),
) {
  @ApiPropertyOptional({ type: UpdateCvPersonalInfoDto })
  @ValidateNested()
  @Type(() => UpdateCvPersonalInfoDto)
  @IsOptional()
  personalInfo?: UpdateCvPersonalInfoDto;

  @ApiPropertyOptional({ type: [UpdateCvCertificateDto] })
  @ValidateNested({ each: true })
  @Type(() => UpdateCvCertificateDto)
  @IsOptional()
  certificates?: UpdateCvCertificateDto[];
}

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
