export type SalaryInsightMatchTier = "exact";

export interface SalaryInsightSampleJob {
  id: string;
  title: string;
  salaryMin: number | null;
  salaryMax: number | null;
  companyName?: string;
}

export interface SalaryInsightAggResult {
  sampleCount: number;
  matchTier: SalaryInsightMatchTier | null;
  rangeLow: number | null;
  medianMidpoint: number | null;
  rangeHigh: number | null;
  sampleJobs?: SalaryInsightSampleJob[];
}
