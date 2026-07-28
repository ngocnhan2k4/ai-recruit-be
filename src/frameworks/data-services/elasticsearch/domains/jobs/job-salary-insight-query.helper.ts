import { SalaryInsightCriteria } from "@/core/abstracts";
import {
  SalaryInsightAggResult,
  SalaryInsightMatchTier,
} from "@/core/entities/job-salary-insight.entity";

export const DEFAULT_LOOKBACK_MONTHS = 12;

export interface SalaryInsightConfig {
  lookbackMonths: number;
}

const MATCH_TIERS: readonly SalaryInsightMatchTier[] = ["exact"];

function buildBaseFilters(
  excludeJobId: string | undefined,
  lookbackMonths: number,
): { must: any[]; mustNot: any[] } {
  const fromDate = new Date();
  fromDate.setMonth(fromDate.getMonth() - lookbackMonths);

  return {
    must: [
      { term: { status: "active" } },
      {
        bool: {
          should: [
            { range: { datePosted: { gte: fromDate.toISOString() } } },
            {
              bool: {
                must_not: { exists: { field: "datePosted" } },
                filter: {
                  range: { createdAt: { gte: fromDate.toISOString() } },
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
      // Excludes jobs without a real declared salary ("thoả thuận" jobs
      // are stored as 0/null, not omitted) — they would skew the median.
      { range: { salaryMin: { gt: 0 } } },
      { range: { salaryMax: { gt: 0 } } },
    ],
    mustNot: excludeJobId ? [{ term: { id: excludeJobId } }] : [],
  };
}

/**
 * Builds one filter set per match tier, tightest first. Each tier is a
 * strict `filter` (not `should`/boost, which percentiles aggregations
 * ignore entirely) so that only genuinely comparable jobs contribute to
 * the median at a given tier.
 */
function buildTierFilters(
  criteria: SalaryInsightCriteria,
): Record<SalaryInsightMatchTier, any[]> {
  const { categoryId, experienceMin, experienceMax, provinceIds } = criteria;

  const categoryFilter = categoryId ? [{ term: { categoryId } }] : [];

  const experienceFilter = [
    experienceMax !== undefined
      ? { range: { experienceMin: { lte: experienceMax } } }
      : null,
    experienceMin !== undefined
      ? { range: { experienceMax: { gte: experienceMin } } }
      : null,
  ].filter(Boolean);

  const provinceFilter = provinceIds?.length
    ? [{ terms: { provinceIds } }]
    : [];

  return {
    exact: [...categoryFilter, ...experienceFilter, ...provinceFilter],
  };
}

export function buildSalaryInsightQuery(
  criteria: SalaryInsightCriteria,
  config: SalaryInsightConfig,
): any {
  const { must, mustNot } = buildBaseFilters(
    criteria.excludeJobId,
    config.lookbackMonths,
  );
  const tierFilters = buildTierFilters(criteria);

  const filterBuckets: Record<string, any> = {};
  for (const tier of MATCH_TIERS) {
    filterBuckets[tier] = {
      bool: {
        must: tierFilters[tier],
      },
    };
  }

  return {
    size: 0,
    query: {
      bool: {
        must,
        must_not: mustNot,
      },
    },
    aggs: {
      tiers: {
        filters: {
          filters: filterBuckets,
        },
        aggs: {
          midpoint_percentiles: {
            percentiles: {
              script: {
                lang: "painless",
                source:
                  "doc['salaryMin'].size() > 0 && doc['salaryMax'].size() > 0 ? (doc['salaryMin'].value + doc['salaryMax'].value) / 2.0 : null",
              },
              percents: [25, 50, 75],
            },
          },
          sample_jobs: {
            top_hits: {
              size: 5,
              _source: {
                includes: [
                  "id",
                  "title",
                  "salaryMin",
                  "salaryMax",
                  "organizationName",
                  "companyName",
                ],
              },
            },
          },
        },
      },
    },
  };
}

export function parseSalaryInsightResponse(
  response: any,
  minSampleCount: number,
): SalaryInsightAggResult {
  const buckets = response?.aggregations?.tiers?.buckets ?? {};

  let lastResult: SalaryInsightAggResult = {
    sampleCount: 0,
    matchTier: null,
    rangeLow: null,
    medianMidpoint: null,
    rangeHigh: null,
    sampleJobs: [],
  };

  for (const tier of MATCH_TIERS) {
    const bucket = buckets[tier];
    if (!bucket) continue;

    const sampleCount: number = bucket.doc_count ?? 0;
    const values = bucket.midpoint_percentiles?.values ?? {};

    const sampleHits = bucket.sample_jobs?.hits?.hits ?? [];
    const sampleJobs = sampleHits.map((hit: any) => {
      const src = hit._source ?? {};
      return {
        id: src.id ?? hit._id,
        title: src.title ?? "",
        salaryMin: src.salaryMin != null ? Number(src.salaryMin) : null,
        salaryMax: src.salaryMax != null ? Number(src.salaryMax) : null,
        companyName: src.organizationName ?? src.companyName ?? undefined,
      };
    });

    const aggResult: SalaryInsightAggResult = {
      sampleCount,
      matchTier: sampleCount > 0 ? tier : null,
      rangeLow: values["25.0"] ?? null,
      medianMidpoint: values["50.0"] ?? null,
      rangeHigh: values["75.0"] ?? null,
      sampleJobs,
    };

    lastResult = aggResult;

    if (sampleCount >= minSampleCount) {
      return aggResult;
    }
  }

  return lastResult;
}

export function getMatchTiers(): readonly SalaryInsightMatchTier[] {
  return MATCH_TIERS;
}
