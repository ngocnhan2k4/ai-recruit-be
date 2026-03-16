import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsOptional, IsString, IsUUID } from "class-validator";
import { GeneralQueryDto } from "../../common/query";
import { Transform } from "class-transformer";

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
}
