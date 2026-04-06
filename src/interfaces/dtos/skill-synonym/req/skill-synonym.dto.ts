import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { IsArray, IsOptional, IsString } from "class-validator";
import { GeneralQueryDto } from "@/interfaces/dtos/common/query";

export class GetSkillsSynonymsQueryDto extends GeneralQueryDto {}

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
