import { SalaryInsightAggResult } from "@/core/entities/job-salary-insight.entity";
import { JobSalaryInsightDto } from "@/interfaces/dtos";

export const DEFAULT_AT_MARKET_THRESHOLD_RATIO = 0.05;
export const DEFAULT_MIN_SAMPLE_COUNT = 1;

export interface CurrentJobSalary {
  salaryMin: number | null;
  salaryMax: number | null;
}

export interface SalaryInsightThresholds {
  atMarketThresholdRatio: number;
  minSampleCount: number;
}

export function buildSalaryInsightDto(
  agg: SalaryInsightAggResult,
  current: CurrentJobSalary,
  thresholds: SalaryInsightThresholds = {
    atMarketThresholdRatio: DEFAULT_AT_MARKET_THRESHOLD_RATIO,
    minSampleCount: DEFAULT_MIN_SAMPLE_COUNT,
  },
): JobSalaryInsightDto {
  const currentSalaryMin = current.salaryMin;
  const currentSalaryMax = current.salaryMax;
  const currentMidpoint =
    currentSalaryMin !== null && currentSalaryMax !== null
      ? (currentSalaryMin + currentSalaryMax) / 2
      : null;

  const hasMarketData =
    agg.sampleCount >= thresholds.minSampleCount &&
    agg.rangeLow !== null &&
    agg.rangeHigh !== null &&
    agg.medianMidpoint !== null;

  let comparison: "below" | "at" | "above" | null = null;
  if (hasMarketData && currentMidpoint !== null) {
    const medianMidpoint = agg.medianMidpoint!;
    const diffRatio = (currentMidpoint - medianMidpoint) / medianMidpoint;
    if (diffRatio < -thresholds.atMarketThresholdRatio) comparison = "below";
    else if (diffRatio > thresholds.atMarketThresholdRatio)
      comparison = "above";
    else comparison = "at";
  }

  return {
    sampleCount: agg.sampleCount,
    currency: "VND",
    matchTier: hasMarketData ? agg.matchTier : null,
    market: hasMarketData
      ? {
          medianMidpoint: agg.medianMidpoint!,
          rangeLow: agg.rangeLow!,
          rangeHigh: agg.rangeHigh!,
        }
      : null,
    current:
      currentSalaryMin !== null && currentSalaryMax !== null
        ? {
            salaryMin: currentSalaryMin,
            salaryMax: currentSalaryMax,
            midpoint: currentMidpoint!,
          }
        : null,
    comparison,
    sampleJobs: hasMarketData ? agg.sampleJobs : [],
  };
}
