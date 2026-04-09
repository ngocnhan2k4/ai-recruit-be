import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";
import { GeneralQueryDto } from "../../common/query";
import { Transform, Type } from "class-transformer";
import { SkillReviewStatus } from "@/core";

export class CreateSkillDto {
  @ApiProperty({ type: "string", isArray: true })
  @IsString({ each: true })
  name: string[];
}

export class GetSkillsQueryDto extends GeneralQueryDto {
  @ApiProperty({
    type: [String],
    required: false,
    description: "Array of skill IDs",
  })
  @IsOptional()
  @Transform(({ value }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @IsUUID("4", { each: true })
  skillIds?: string[];

  @ApiProperty({ type: "string", isArray: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  })
  fields?: "questionCount"[];

  @ApiProperty({ type: "boolean" })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  questions?: boolean;
}

export class GetCrawledSkillsQueryDto extends GeneralQueryDto {}

export class GetTopDemandedSkillsQueryDto {
  @ApiProperty({
    type: Number,
    required: false,
    default: 3,
    description: "Number of months to look back from now",
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  months?: number = 3;

  @ApiProperty({
    type: Number,
    required: false,
    default: 10,
    description: "Number of top skills to return",
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  limit?: number = 10;
}

export class GetDemandedSkillsQueryDto {
  @ApiProperty({
    type: Number,
    required: false,
    default: 0,
    description:
      "Number of months to look back from now. 0 means all-time (no date filter).",
    example: 3,
  })
  @IsOptional()
  @Type(() => Number)
  months?: number = 0;
}

export class BulkReviewSkillDto {
  @ApiProperty({ type: [String], format: "uuid" })
  @IsArray()
  @IsUUID("4", { each: true })
  ids: string[];

  @ApiProperty({ enum: SkillReviewStatus })
  @IsEnum(SkillReviewStatus)
  status: SkillReviewStatus;
}
