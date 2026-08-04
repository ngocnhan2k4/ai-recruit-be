import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsDate,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Min,
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
  isApproved?: boolean;

  @ApiProperty({ type: "boolean", required: false })
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  questions?: boolean;

  @ApiProperty({
    type: Number,
    required: false,
    description: "Minimum number of questions a skill must have",
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  minQuestionCount?: number;
}

export class GetCrawledSkillsQueryDto extends GeneralQueryDto {
  @ApiProperty({ type: "string", isArray: true, required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  })
  fields?: "createdAt"[];
}

export class GetTopDemandedSkillsQueryDto {
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

  @ApiProperty({ type: Date, required: false, example: "2024-01-01" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  fromDate?: Date;

  @ApiProperty({ type: Date, required: false, example: "2024-12-31" })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  toDate?: Date;

  @ApiProperty({
    type: String,
    required: false,
    description: "Filter by province UUID",
    example: "9f1a9d45-3a5c-4f4a-bf57-182f98244fcd",
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value || undefined)
  provinceId?: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "Filter by job category UUID",
    example: "9f1a9d45-3a5c-4f4a-bf57-182f98244fcd",
  })
  @IsOptional()
  @IsString()
  @Transform(({ value }) => value || undefined)
  categoryId?: string;
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

export class DeleteSkillsDto {
  @ApiProperty({
    description:
      "Skill ID or list of Skill IDs. A single string will be converted to an array.",
    oneOf: [
      { type: "string", format: "uuid" },
      { type: "array", items: { type: "string", format: "uuid" } },
    ],
    example: ["9f1a9d45-3a5c-4f4a-bf57-182f98244fcd"],
  })
  @ArrayNotEmpty()
  @Transform(({ value }) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  })
  @IsArray()
  @IsUUID("4", { each: true })
  skillIds: string[];
}

export class UpdateSkillNameDto {
  @ApiProperty({
    type: String,
    description: "New skill name",
    example: "Node.js",
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
