import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsEnum, IsDateString } from "class-validator";

export enum JobTrendTypeEnum {
  CREATED = "created",
  CRAWLED = "crawled",
}

export class JobTrendsQueryDto {
  @ApiProperty({
    required: false,
    description: "Start date for filtering (ISO date string)",
    example: "2024-01-01",
  })
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @ApiProperty({
    required: false,
    description: "End date for filtering (ISO date string)",
    example: "2024-12-31",
  })
  @IsOptional()
  @IsDateString()
  toDate?: string;

  @ApiProperty({
    enum: JobTrendTypeEnum,
    required: false,
    description: "Type of job trend to retrieve",
  })
  @IsOptional()
  @IsEnum(JobTrendTypeEnum)
  type?: JobTrendTypeEnum;
}
