import { buildSalaryInsightDto } from "./job-salary-insight.helper";

describe("buildSalaryInsightDto", () => {
  it("marks comparison as below when current midpoint is more than 5% under market", () => {
    const result = buildSalaryInsightDto(
      {
        sampleCount: 10,
        matchTier: "exact",
        rangeLow: 15000000,
        medianMidpoint: 18000000,
        rangeHigh: 22000000,
      },
      { salaryMin: 12000000, salaryMax: 20000000 },
    );

    expect(result.comparison).toBe("below");
    expect(result.matchTier).toBe("exact");
    expect(result.market).toEqual({
      medianMidpoint: 18000000,
      rangeLow: 15000000,
      rangeHigh: 22000000,
    });
    expect(result.current).toEqual({
      salaryMin: 12000000,
      salaryMax: 20000000,
      midpoint: 16000000,
    });
    expect(result.sampleCount).toBe(10);
    expect(result.currency).toBe("VND");
  });

  it("marks comparison as above when current midpoint is more than 5% over market", () => {
    const result = buildSalaryInsightDto(
      {
        sampleCount: 5,
        matchTier: "regional",
        rangeLow: 10000000,
        medianMidpoint: 12000000,
        rangeHigh: 14000000,
      },
      { salaryMin: 15000000, salaryMax: 17000000 },
    );

    expect(result.comparison).toBe("above");
  });

  it("marks comparison as at when current midpoint is within 5% of market", () => {
    const result = buildSalaryInsightDto(
      {
        sampleCount: 5,
        matchTier: "category",
        rangeLow: 10000000,
        medianMidpoint: 12000000,
        rangeHigh: 14000000,
      },
      { salaryMin: 11800000, salaryMax: 12200000 },
    );

    expect(result.comparison).toBe("at");
  });

  it("returns null market, matchTier and comparison when sampleCount is below the minimum threshold", () => {
    const result = buildSalaryInsightDto(
      {
        sampleCount: 3,
        matchTier: "category",
        rangeLow: 15000000,
        medianMidpoint: 18000000,
        rangeHigh: 22000000,
      },
      { salaryMin: 12000000, salaryMax: 20000000 },
      { atMarketThresholdRatio: 0.05, minSampleCount: 5 },
    );

    expect(result.market).toBeNull();
    expect(result.matchTier).toBeNull();
    expect(result.comparison).toBeNull();
    expect(result.current).toEqual({
      salaryMin: 12000000,
      salaryMax: 20000000,
      midpoint: 16000000,
    });
  });

  it("respects a custom minSampleCount threshold", () => {
    const result = buildSalaryInsightDto(
      {
        sampleCount: 8,
        matchTier: "regional",
        rangeLow: 15000000,
        medianMidpoint: 18000000,
        rangeHigh: 22000000,
      },
      { salaryMin: 18000000, salaryMax: 18000000 },
      { atMarketThresholdRatio: 0.05, minSampleCount: 10 },
    );

    expect(result.market).toBeNull();
    expect(result.matchTier).toBeNull();
    expect(result.comparison).toBeNull();
  });

  it("returns null market and null comparison when sampleCount is zero", () => {
    const result = buildSalaryInsightDto(
      {
        sampleCount: 0,
        matchTier: null,
        rangeLow: null,
        medianMidpoint: null,
        rangeHigh: null,
      },
      { salaryMin: 12000000, salaryMax: 20000000 },
    );

    expect(result.market).toBeNull();
    expect(result.matchTier).toBeNull();
    expect(result.comparison).toBeNull();
    expect(result.current).toEqual({
      salaryMin: 12000000,
      salaryMax: 20000000,
      midpoint: 16000000,
    });
  });

  it("returns null current when the job has no salary declared", () => {
    const result = buildSalaryInsightDto(
      {
        sampleCount: 10,
        matchTier: "exact",
        rangeLow: 15000000,
        medianMidpoint: 18000000,
        rangeHigh: 22000000,
      },
      { salaryMin: null, salaryMax: null },
    );

    expect(result.current).toBeNull();
    expect(result.market).not.toBeNull();
    expect(result.comparison).toBeNull();
  });

  it("treats missing percentile fields as no market data even with samples", () => {
    const result = buildSalaryInsightDto(
      {
        sampleCount: 8,
        matchTier: "exact",
        rangeLow: null,
        medianMidpoint: 18000000,
        rangeHigh: 22000000,
      },
      { salaryMin: 12000000, salaryMax: 20000000 },
    );

    expect(result.market).toBeNull();
    expect(result.matchTier).toBeNull();
    expect(result.comparison).toBeNull();
  });
});
