import { ApiProperty } from "@nestjs/swagger";

// --- topByTotalJobs ---

export class CompareTotalJobsItemDto {
  @ApiProperty({ example: "category-uuid" })
  categoryId: string;

  @ApiProperty({ example: 100 })
  totalJobByCategoryId: number;
}

// --- topByOpenJobs ---

export class CompareOpenJobsItemDto {
  @ApiProperty({ example: "category-uuid" })
  categoryId: string;

  @ApiProperty({ example: 60 })
  openJobCount: number;
}

// --- topByTrend ---

class FrequentlyJobDto {
  @ApiProperty({ example: "2025-09-21" })
  date: string;

  @ApiProperty({ example: 10 })
  count: number;
}

export class CompareTrendItemDto {
  @ApiProperty({ example: "category-uuid" })
  categoryId: string;

  @ApiProperty({ type: [FrequentlyJobDto] })
  frequentlyJobs: FrequentlyJobDto[];
}

// --- topBySalary ---

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

export class CompareSalaryItemDto {
  @ApiProperty({ example: "category-uuid" })
  categoryId: string;

  @ApiProperty({ type: [SalaryStatisticsDto] })
  salaryStatistics: SalaryStatisticsDto[];
}

// --- Response ---

export class CompareStatisticsResponseDto {
  @ApiProperty({ example: 500 })
  totalJobs: number;

  @ApiProperty({ type: [CompareTotalJobsItemDto] })
  topByTotalJobs: CompareTotalJobsItemDto[];

  @ApiProperty({ type: [CompareOpenJobsItemDto] })
  topByOpenJobs: CompareOpenJobsItemDto[];

  @ApiProperty({ type: [CompareTrendItemDto] })
  topByTrend: CompareTrendItemDto[];

  @ApiProperty({ type: [CompareSalaryItemDto] })
  topBySalary: CompareSalaryItemDto[];
}

// --- TopInMarket (independent groups) ---

class TopInMarketDto {
  @ApiProperty({ example: "uuid", required: false })
  id: string;

  @ApiProperty({ example: "Frontend Developer" })
  name: string;

  @ApiProperty({ example: "https://logo.url", required: false })
  logoUrl?: string;

  @ApiProperty({ example: 42, required: false })
  count?: number;

  @ApiProperty({ example: 12.5 })
  percentage: number;
}

export class CompareTopAppliedItemDto {
  @ApiProperty({ example: "category-uuid" })
  categoryId: string;

  @ApiProperty({ type: [TopInMarketDto] })
  topAppliedJobs: TopInMarketDto[];
}

export class CompareTopEmployerItemDto {
  @ApiProperty({ example: "category-uuid" })
  categoryId: string;

  @ApiProperty({ type: [TopInMarketDto] })
  topEmployers: TopInMarketDto[];
}

export class CompareTopInMarketResponseDto {
  @ApiProperty({ type: [CompareTopAppliedItemDto] })
  topByApplied: CompareTopAppliedItemDto[];

  @ApiProperty({ type: [CompareTopEmployerItemDto] })
  topByEmployer: CompareTopEmployerItemDto[];
}
