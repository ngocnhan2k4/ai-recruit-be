import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsArray,
  IsEnum,
} from "class-validator";
import { Type } from "class-transformer";
import { WorkTypeEnum } from "@/core";
import { GeneralQueryDto } from "../../common/query";

export class QueryMatchedJobsDto extends GeneralQueryDto {
  @ApiProperty({
    example: 15000000,
    required: false,
    description: "Minimum salary filter",
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  salaryMin?: number;

  @ApiProperty({
    example: 20000000,
    required: false,
    description:
      "Maximum salary filter (also used as expected salary for scoring)",
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  salaryMax?: number;

  @ApiProperty({
    example: ["uuid-province-id"],
    required: false,
    description: "Array of province IDs to filter by",
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  provinceIds?: string[];

  @ApiProperty({
    example: "uuid-category-id",
    required: false,
    description: "Category ID to filter by",
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({
    example: "remote",
    required: false,
    description: "Work type (remote, onsite, hybrid)",
    enum: WorkTypeEnum,
  })
  @IsOptional()
  @IsEnum(WorkTypeEnum)
  workType?: WorkTypeEnum;
}
