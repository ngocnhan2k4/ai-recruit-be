import { ApiProperty } from "@nestjs/swagger";
import {
  IsOptional,
  IsEnum,
  IsArray,
  IsString,
  IsDateString,
} from "class-validator";
import { Transform } from "class-transformer";
import { JobStatusEnum } from "@/core";
import { GeneralQueryDto } from "../../common/query";

export class OrganizationJobQueryDto extends GeneralQueryDto {
  @ApiProperty({ enum: JobStatusEnum, required: false })
  @IsOptional()
  @IsEnum(JobStatusEnum)
  status?: JobStatusEnum;

  @ApiProperty({ example: "2024-01-01", required: false })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiProperty({ example: "2024-12-31", required: false })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  categoryIds?: string[];

  @ApiProperty({ type: [String], required: false })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) =>
    Array.isArray(value) ? value : value ? [value] : undefined,
  )
  fields?: string[];
}
