import {
  buildSalaryInsightQuery,
  parseSalaryInsightResponse,
} from "./job-salary-insight-query.helper";

describe("job-salary-insight-query.helper", () => {
  describe("buildSalaryInsightQuery", () => {
    it("builds a single query with exact tier filters and null-safe Painless script", () => {
      const query = buildSalaryInsightQuery(
        {
          excludeJobId: "job-123",
          categoryId: "cat-1",
          experienceMin: 1,
          experienceMax: 3,
        },
        { lookbackMonths: 12 },
      );

      expect(query.size).toBe(0);
      expect(query.query.bool.must).toBeDefined();
      expect(query.query.bool.must_not).toEqual([{ term: { id: "job-123" } }]);

      // Check Painless script null-safety
      const scriptSource =
        query.aggs.tiers.aggs.midpoint_percentiles.percentiles.script.source;
      expect(scriptSource).toContain("doc['salaryMin'].size() > 0");
      expect(scriptSource).toContain("doc['salaryMax'].size() > 0");

      // Check tier filter buckets
      const filterBuckets = query.aggs.tiers.filters.filters;
      expect(filterBuckets.exact).toBeDefined();
      expect(filterBuckets.regional).toBeUndefined();
    });

    it("builds query with empty must_not when excludeJobId is not provided (create-flow case)", () => {
      const query = buildSalaryInsightQuery(
        { categoryId: "cat-1", experienceMin: 1, experienceMax: 3 },
        { lookbackMonths: 12 },
      );

      expect(query.query.bool.must_not).toEqual([]);
    });

    it("includes a provinceIds terms filter in the exact tier when provinceIds is provided", () => {
      const query = buildSalaryInsightQuery(
        {
          categoryId: "cat-1",
          provinceIds: ["prov-1", "prov-2"],
        },
        { lookbackMonths: 12 },
      );

      const exactFilters = query.aggs.tiers.filters.filters.exact.bool.must;
      expect(exactFilters).toContainEqual({
        terms: { provinceIds: ["prov-1", "prov-2"] },
      });
    });

    it("omits the provinceIds filter when provinceIds is empty or not provided", () => {
      const query = buildSalaryInsightQuery(
        { categoryId: "cat-1", provinceIds: [] },
        { lookbackMonths: 12 },
      );

      const exactFilters = query.aggs.tiers.filters.filters.exact.bool.must;
      expect(
        exactFilters.some((f: any) => "terms" in f && "provinceIds" in f.terms),
      ).toBe(false);
    });

    it("omits the categoryId filter when categoryId is not provided", () => {
      const query = buildSalaryInsightQuery(
        { experienceMin: 1, experienceMax: 3 },
        { lookbackMonths: 12 },
      );

      const exactFilters = query.aggs.tiers.filters.filters.exact.bool.must;
      expect(
        exactFilters.some((f: any) => "term" in f && "categoryId" in f.term),
      ).toBe(false);
    });
  });

  describe("parseSalaryInsightResponse", () => {
    it("returns exact tier result when sample count satisfies minSampleCount", () => {
      const mockResponse = {
        aggregations: {
          tiers: {
            buckets: {
              exact: {
                doc_count: 8,
                midpoint_percentiles: {
                  values: {
                    "25.0": 15000000,
                    "50.0": 18000000,
                    "75.0": 22000000,
                  },
                },
              },
            },
          },
        },
      };

      const result = parseSalaryInsightResponse(mockResponse, 1);

      expect(result).toEqual({
        sampleCount: 8,
        matchTier: "exact",
        rangeLow: 15000000,
        medianMidpoint: 18000000,
        rangeHigh: 22000000,
        sampleJobs: [],
      });
    });
  });
});
