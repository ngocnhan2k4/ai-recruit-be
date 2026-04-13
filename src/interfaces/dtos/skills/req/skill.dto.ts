import { ApiProperty } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
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
  @Transform(({ value, obj }) => {
    const raw = value ?? obj?.isApprove;
    if (raw === undefined || raw === null || raw === "") return undefined;
    if (raw === true || raw === "true") return true;
    if (raw === false || raw === "false") return false;
    return raw;
  })
  @Type(() => Boolean)
  isApproved?: boolean;

  @ApiProperty({ type: "boolean", required: false })
  @IsOptional()
  @IsBoolean()
  questions?: boolean;
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
