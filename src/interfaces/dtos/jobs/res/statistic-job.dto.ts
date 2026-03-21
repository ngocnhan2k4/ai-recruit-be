import { ApiProperty } from "@nestjs/swagger";

class FrequentlyJobDto {
  @ApiProperty({ example: "2025-09-21" })
  date: string;

  @ApiProperty({ example: 10 })
  count: number;
}

class SalaryStatisticsDto {
  @ApiProperty({ example: "1-3 năm" })
  expRange: string;

  @ApiProperty({ example: 8.5 })
  avgSalaryMin: number;

  @ApiProperty({ example: 14.2 })
  avgSalaryMax: number;

  @ApiProperty({ example: 39 })
  jobCount: number;
}

export class TopInMarketDto {
  id?: string;
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
