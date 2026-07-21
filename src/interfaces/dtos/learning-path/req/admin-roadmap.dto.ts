import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDate, IsEnum, IsOptional, IsUUID } from "class-validator";
import { GeneralQueryDto } from "../../common/query";
import { LearningRoadmapGenerationStatusEnum } from "@/core/entities/enum.entity";

export class GetAdminLearningRoadmapsRequestDto extends GeneralQueryDto {
  @ApiProperty({
    required: false,
    enum: LearningRoadmapGenerationStatusEnum,
    description: "Filter by generation status",
  })
  @IsOptional()
  @IsEnum(LearningRoadmapGenerationStatusEnum)
  generationStatus?: LearningRoadmapGenerationStatusEnum;

  @ApiProperty({
    required: false,
    description: "Filter by the user that owns the roadmap",
  })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiProperty({
    required: false,
    description: "Filter roadmaps created from this date (inclusive)",
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  startDate?: Date;

  @ApiProperty({
    required: false,
    description: "Filter roadmaps created up to this date (inclusive)",
  })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  endDate?: Date;
}
