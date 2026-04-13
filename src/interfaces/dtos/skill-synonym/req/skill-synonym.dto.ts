import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUUID,
} from "class-validator";
import { GeneralQueryDto } from "@/interfaces/dtos/common/query";

export class GetSkillsSynonymsQueryDto extends GeneralQueryDto {
  @ApiProperty({
    required: false,
    description: "Filter skills that have synonyms or not",
  })
  @IsOptional()
  @Transform(({ value }) => {
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  })
  @IsBoolean()
  hasSynonyms?: boolean;
}

export class UpdateSkillSynonymDto {
  @ApiProperty({
    type: [String],
    example: ["js", "ecmascript"],
    description: "Updated alias names",
  })
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  })
  aliasNames: string[];

  @ApiProperty({
    required: false,
    description: "Synonym source",
    example: "manual",
  })
  @IsOptional()
  @IsString()
  source?: string;
}

export class MergeSkillsDto {
  @ApiProperty({
    description:
      "Source skill ID or list of source skill IDs to merge into target skill",
    oneOf: [
      { type: "string", format: "uuid" },
      { type: "array", items: { type: "string", format: "uuid" } },
    ],
    example: [
      "9f1a9d45-3a5c-4f4a-bf57-182f98244fcd",
      "e2ef2d4d-c6a4-4a0c-a54e-cc1a72f0d6f0",
    ],
  })
  @Transform(({ value }) => {
    if (!value) return [];
    return Array.isArray(value) ? value : [value];
  })
  @ArrayNotEmpty()
  @IsArray()
  @IsUUID("4", { each: true })
  sourceSkillIds: string[];
}
