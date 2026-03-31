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

export class BulkReviewSkillDto {
  @ApiProperty({ type: [String], format: "uuid" })
  @IsArray()
  @IsUUID("4", { each: true })
  ids: string[];

  @ApiProperty({ enum: SkillReviewStatus })
  @IsEnum(SkillReviewStatus)
  status: SkillReviewStatus;
}
