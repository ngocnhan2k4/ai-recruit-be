import { ApiPropertyOptional, OmitType, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { CvTemplateEnum } from "@/core";
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

export class UpdateAiCvV2Dto {
  @ApiPropertyOptional({
    type: UpdateOptimizedCvDataDto,
    description: "The edited structured JSON data of the CV",
  })
  @ValidateNested()
  @Type(() => UpdateOptimizedCvDataDto)
  @IsOptional()
  editedCvData?: UpdateOptimizedCvDataDto;

  @ApiPropertyOptional({
    example: "My Optimized CV for Backend Dev",
    description: "The display title of the CV",
  })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({
    enum: CvTemplateEnum,
    example: CvTemplateEnum.CLASSIC,
    description: "CV template to use for rendering",
  })
  @IsEnum(CvTemplateEnum)
  @IsOptional()
  template?: CvTemplateEnum;

  @ApiPropertyOptional({
    example: false,
    description: "Whether to mark this CV as a favorite",
  })
  @IsBoolean()
  @IsOptional()
  isFavorite?: boolean;
}
