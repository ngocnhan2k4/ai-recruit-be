import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsOptional, IsString, IsDate } from "class-validator";

export class StatisticsJobFilterRequestDto {
  @ApiProperty({ type: Date, example: "2023-01-01" })
  @Type(() => Date)
  @IsDate()
  fromDate: Date;

  @ApiProperty({ type: Date, example: "2023-12-31" })
  @Type(() => Date)
  @IsDate()
  toDate: Date;

  @ApiProperty({ type: String, example: "category-uuid" })
  @IsString()
  @IsOptional()
  categoryId: string;

  @ApiProperty({ type: String, example: "province-uuid", required: false })
  @IsOptional()
  @IsString()
  provinceId: string;
}

class FrequentlyJobDto {
  @ApiProperty({ example: "2025-09-21" })
  date: string;

  @ApiProperty({ example: 10 })
  count: number;
}

class SalaryStatisticsDto {
  @ApiProperty({ example: 1 })
  expYear: number;

  @ApiProperty({ example: 500 })
  avgSalaryMin: number;

  @ApiProperty({ example: 1000 })
  avgSalaryMax: number;

  @ApiProperty({ example: 20 })
  jobCount: number;
}

export class TopInMarketDto {
  name: string;
  logoUrl?: string;
  count?: number;
  percentage: number;
}

export class TopInMarketDtoResponse {
  @ApiProperty({ type: [TopInMarketDto] })
  topAppliedJobs: TopInMarketDto[];

  @ApiProperty({ type: [TopInMarketDto] })
  topEmployers: TopInMarketDto[];

  @ApiProperty({ type: [TopInMarketDto] })
  topCategories: TopInMarketDto[];
}

export class StatisticsJobResponse {
  @ApiProperty({ type: [FrequentlyJobDto] })
  frequentlyJobs: FrequentlyJobDto[];

  @ApiProperty({ type: Number, example: 150 })
  openJobCount: number;

  @ApiProperty({ type: [SalaryStatisticsDto] })
  salaryStatistics: SalaryStatisticsDto[];

  @ApiProperty({ type: Number, example: 500 })
  totalJobs: number;

  @ApiProperty({ type: Number, example: 100 })
  totalJobByCategoryId: number;
}
