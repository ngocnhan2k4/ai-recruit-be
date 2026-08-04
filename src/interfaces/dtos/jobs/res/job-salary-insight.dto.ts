import { ApiProperty } from "@nestjs/swagger";

export class SalaryInsightMarketDto {
  @ApiProperty({ example: 18000000 })
  medianMidpoint: number;

  @ApiProperty({ example: 15000000 })
  rangeLow: number;

  @ApiProperty({ example: 22000000 })
  rangeHigh: number;
}

export class SalaryInsightCurrentDto {
  @ApiProperty({ example: 12000000 })
  salaryMin: number;

  @ApiProperty({ example: 20000000 })
  salaryMax: number;

  @ApiProperty({ example: 16000000 })
  midpoint: number;
}

export class SalaryInsightSampleJobDto {
  @ApiProperty({ example: "job-123" })
  id: string;

  @ApiProperty({ example: "Frontend Developer" })
  title: string;

  @ApiProperty({ example: 15000000, nullable: true })
  salaryMin: number | null;

  @ApiProperty({ example: 20000000, nullable: true })
  salaryMax: number | null;

  @ApiProperty({ example: "ACME Corp", required: false })
  companyName?: string;
}

export class JobSalaryInsightDto {
  @ApiProperty({ example: 42 })
  sampleCount: number;

  @ApiProperty({ example: "VND" })
  currency: string;

  @ApiProperty({
    example: "exact",
    enum: ["exact"],
    nullable: true,
    description:
      "Match tier: exact = same category + experience range across all regions.",
  })
  matchTier: "exact" | null;

  @ApiProperty({ type: SalaryInsightMarketDto, nullable: true })
  market: SalaryInsightMarketDto | null;

  @ApiProperty({ type: SalaryInsightCurrentDto, nullable: true })
  current: SalaryInsightCurrentDto | null;

  @ApiProperty({
    example: "below",
    enum: ["below", "at", "above"],
    nullable: true,
  })
  comparison: "below" | "at" | "above" | null;

  @ApiProperty({ type: [SalaryInsightSampleJobDto], required: false })
  sampleJobs?: SalaryInsightSampleJobDto[];
}
