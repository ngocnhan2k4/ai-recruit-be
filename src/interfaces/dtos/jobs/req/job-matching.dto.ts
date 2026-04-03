import { ApiProperty } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  IsDateString,
  IsArray,
  IsUUID,
} from "class-validator";
import { Transform, Type } from "class-transformer";
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
    example: 1,
    required: false,
    description: "Minimum years of experience",
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  experienceMin?: number;

  @ApiProperty({
    example: 5,
    required: false,
    description: "Maximum years of experience",
  })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  experienceMax?: number;

  @ApiProperty({
    example: ["uuid-province-id"],
    required: false,
    description: "Array of province IDs to filter by",
    type: [String],
  })
  @IsOptional()
  @IsString()
  provinceId?: string;

  @ApiProperty({
    example: "uuid-category-id",
    required: false,
    description: "Category ID to filter by",
  })
  @IsOptional()
  @IsString()
  categoryId?: string;

  @ApiProperty({
    required: false,
    description: "Organization ID to filter by",
  })
  @IsOptional()
  @IsString()
  organizationId?: string;

  @ApiProperty({
    example: "remote",
    required: false,
    description: "Work type (remote, onsite, hybrid)",
    enum: WorkTypeEnum,
  })
  @IsOptional()
  @IsEnum(WorkTypeEnum)
  workType?: WorkTypeEnum;

  @ApiProperty({
    example: "2024-01-01",
    required: false,
    description: "Filter jobs posted on or after this date (ISO string)",
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiProperty({
    example: "2024-12-31",
    required: false,
    description: "Filter jobs posted on or before this date (ISO string)",
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

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
