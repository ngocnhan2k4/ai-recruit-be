import { Injectable, Logger } from "@nestjs/common";
import { ISearchService, IJobSearchService } from "@/core/abstracts";
import { JobFilters, JobSearchDocument, UserProfile } from "@/core/entities";
import { PaginatedResult } from "@/common/types";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class JobSearchService implements IJobSearchService {
  private readonly logger = new Logger(JobSearchService.name);

  constructor(
    private readonly searchService: ISearchService,
    private readonly configService: ConfigService,
  ) {}

  async searchJobs(
    filters: JobFilters,
  ): Promise<PaginatedResult<JobSearchDocument>> {
    let knnQuery: any = undefined;

    if (filters.recentInteractions && filters.recentInteractions.length > 0) {
      const jobIds = filters.recentInteractions.map((r: any) => r.jobId);
      const vectorsMap = await this.getVectorsForJobs(jobIds);
      if (vectorsMap.size > 0) {
        const avgVector = this.averageVectors(
          filters.recentInteractions,
          vectorsMap,
        );
        knnQuery = {
          field: "embedding",
          query_vector: avgVector,
          k: (filters.limit ?? 20) + 50,
          num_candidates: 100,
          boost: 5.0,
        };
      }
    }

    const { index, body } = this.buildSearchQuery(filters, knnQuery) as {
      index: string;
      body: any;
    };

    const response = await this.searchService.search(index, body);
    const hits = (response?.hits?.hits ?? []) as any[];

    const limit = filters.limit ?? 20;
    const hasMore = hits.length > limit;
    const actualHits = hasMore ? hits.slice(0, limit) : hits;

    let nextCursor: string | undefined;
    if (hasMore && actualHits.length > 0) {
      const searchAfter = actualHits[actualHits.length - 1]?.sort;
      if (Array.isArray(searchAfter)) {
        nextCursor = Buffer.from(JSON.stringify(searchAfter)).toString(
          "base64",
        );
      }
    }

    const docs: JobSearchDocument[] = actualHits
      .map((h) => h?._source)
      .filter((s): s is JobSearchDocument => Boolean(s?.id));

    return { data: docs, pagination: { nextCursor, hasNextPage: hasMore } };
  }

  private buildSearchQuery(filters: JobFilters, knnQuery?: any): any {
    const {
      cursor,
      limit = 20,
      status,
      statuses,
      workType,
      provinceId,
      categoryId,
      keyword,
      skillIds,
      organizationId,
      salaryMin,
      salaryMax,
      experienceMin,
      experienceMax,
      fromDate,
      toDate,
      sortBy,
      sortDirection,
    } = filters;

    let searchAfter: any[] | undefined;
    if (cursor) {
      try {
        searchAfter = JSON.parse(Buffer.from(cursor, "base64").toString());
      } catch {
        this.logger.warn("Invalid cursor");
      }
    }

    const mustQueries: any[] = [
      // endDate filter: match jobs whose endDate >= today OR endDate is missing/null
      {
        bool: {
          should: [
            { range: { endDate: { gte: "now/d" } } },
            { bool: { must_not: { exists: { field: "endDate" } } } },
          ],
          minimum_should_match: 1,
        },
      },
    ];

    const statusFilters = statuses?.length ? statuses : status ? [status] : [];

    if (statusFilters.length) {
      mustQueries.push({
        terms: { status: statusFilters },
      });
    }
    if (workType) {
      mustQueries.push({ term: { workType } });
    }

    if (provinceId) {
      mustQueries.push({ term: { provinceIds: provinceId } });
    }

    if (categoryId) {
      mustQueries.push({ term: { categoryId } });
    }

    if (skillIds && skillIds.length > 0) {
      mustQueries.push({
        terms: {
          skillIds: skillIds,
        },
      });
    }

    if (organizationId) {
      mustQueries.push({
        term: {
          organizationId,
        },
      });
    }

    if (salaryMin !== undefined || salaryMax !== undefined) {
      if (salaryMin !== undefined) {
        mustQueries.push({
          range: {
            salaryMax: { gte: salaryMin },
          },
        });
      }

      if (salaryMax !== undefined) {
        mustQueries.push({
          range: {
            salaryMin: { lte: salaryMax },
          },
        });
      }
    }

    if (experienceMin !== undefined || experienceMax !== undefined) {
      if (experienceMin !== undefined) {
        mustQueries.push({
          range: {
            experienceMax: { gte: experienceMin },
          },
        });
      }

      if (experienceMax !== undefined) {
        mustQueries.push({
          range: {
            experienceMin: { lte: experienceMax },
          },
        });
      }
    }

    if (fromDate || toDate) {
      const datePostedRangeQuery: any = {};
      const createdAtRangeQuery: any = {};

      if (fromDate) {
        const fromDateIso = new Date(fromDate).toISOString();
        datePostedRangeQuery.gte = fromDateIso;
        createdAtRangeQuery.gte = fromDateIso;
      }

      if (toDate) {
        const toDateObj = new Date(toDate);
        toDateObj.setHours(23, 59, 59, 999);
        const toDateIso = toDateObj.toISOString();
        datePostedRangeQuery.lte = toDateIso;
        createdAtRangeQuery.lte = toDateIso;
      }

      mustQueries.push({
        bool: {
          should: [
            {
              range: {
                datePosted: datePostedRangeQuery,
              },
            },
            {
              bool: {
                must_not: {
                  exists: { field: "datePosted" },
                },
                filter: {
                  range: {
                    createdAt: createdAtRangeQuery,
                  },
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    }

    const shouldQueries: any[] = [];

    // Boost các job mới (gần hiện tại nhất) nếu người dùng không filter theo date
    if (!fromDate && !toDate) {
      shouldQueries.push(
        {
          distance_feature: {
            field: "createdAt",
            pivot: "10d",
            origin: "now/h", // Làm tròn theo giờ để tận dụng ES Query Cache
            boost: 10,
          },
        },
        {
          distance_feature: {
            field: "datePosted",
            pivot: "10d",
            origin: "now/h", // Làm tròn theo giờ để tận dụng ES Query Cache
            boost: 15,
          },
        },
      );
    }

    // Tích hợp Soft boost từ UserPreference
    if (filters.userPreference) {
      const prefs = filters.userPreference;
      if (prefs.lastCategories && prefs.lastCategories.length > 0) {
        shouldQueries.push({
          terms: { categoryId: prefs.lastCategories, boost: 1.5 },
        });
      }
      if (prefs.lastProvinces && prefs.lastProvinces.length > 0) {
        shouldQueries.push({
          terms: { provinceIds: prefs.lastProvinces, boost: 1.5 },
        });
      }
    }

    if (keyword) {
      shouldQueries.push(
        { match: { title: { query: keyword, boost: 2.5 } } },
        { match: { description: { query: keyword, boost: 1.0 } } },
        { match: { skillNames: { query: keyword, boost: 2.0 } } },
        { match: { organizationName: { query: keyword, boost: 2 } } },
        { match: { categoryName: { query: keyword, boost: 1.5 } } },
        { match: { provinceNames: { query: keyword, boost: 1.3 } } },
      );
    }

    const mustNotQueries: any[] = [];
    if (filters.excludeJobIds && filters.excludeJobIds.length > 0) {
      mustNotQueries.push({
        terms: { id: filters.excludeJobIds },
      });
    }

    if (knnQuery) {
      knnQuery.filter = {
        bool: {
          must: mustQueries,
          must_not: mustNotQueries,
        },
      };
    }

    return {
      index: this.configService.get<string>("ELASTICSEARCH_INDEX_JOBS"),
      body: {
        query: {
          bool: {
            must: mustQueries,
            should: shouldQueries,
            must_not: mustNotQueries,
            ...(keyword && { minimum_should_match: 1 }),
          },
        },
        sort: this.buildSort(sortBy, sortDirection),
        size: limit + 1,
        ...(searchAfter && { search_after: searchAfter }),
        ...(knnQuery && { knn: knnQuery }),
        // Exclude embedding (1536 floats) - never needed in search results
        _source: {
          excludes: ["embedding"],
        },
      },
    };
  }

  async matchJobs(
    userProfile: UserProfile,
    filters: JobFilters,
  ): Promise<PaginatedResult<JobSearchDocument>> {
    let knnQuery: any = undefined;

    if (filters.recentInteractions && filters.recentInteractions.length > 0) {
      const jobIds = filters.recentInteractions.map((r: any) => r.jobId);
      const vectorsMap = await this.getVectorsForJobs(jobIds);
      if (vectorsMap.size > 0) {
        const avgVector = this.averageVectors(
          filters.recentInteractions,
          vectorsMap,
        );
        knnQuery = {
          field: "embedding",
          query_vector: avgVector,
          k: (filters.limit ?? 20) + 50,
          num_candidates: 100,
          boost: 0.5,
        };
      }
    }

    const { index, body } = this.buildMatchQuery(
      userProfile,
      filters,
      knnQuery,
    ) as {
      index: string;
      body: any;
    };

    const response = await this.searchService.search(index, body);
    const hits = (response?.hits?.hits ?? []) as any[];

    const limit = filters.limit ?? 20;
    const hasMore = hits.length > limit;
    const actualHits = hasMore ? hits.slice(0, limit) : hits;

    let nextCursor: string | undefined;
    if (hasMore && actualHits.length > 0) {
      const searchAfter = actualHits[actualHits.length - 1]?.sort;
      if (Array.isArray(searchAfter)) {
        nextCursor = Buffer.from(JSON.stringify(searchAfter)).toString(
          "base64",
        );
      }
    }

    const docs = actualHits.flatMap((h) => {
      const source = h?._source;
      if (!source?.id) return [];
      // Normalize raw ES score (unbounded) to 0-100% via sigmoid
      // sigmoid(x) = 1 / (1 + e^-x), scaled so score ~1 → ~73%, score ~3 → ~95%
      const score =
        typeof h?._score === "number"
          ? Number((100 / (1 + Math.exp(-h._score * 0.5))).toFixed(1))
          : undefined;
      return [{ ...source, ...(typeof score === "number" ? { score } : {}) }];
    }) satisfies JobSearchDocument[];

    return { data: docs, pagination: { nextCursor, hasNextPage: hasMore } };
  }

  private readonly sortableFields: Record<string, string> = {
    score: "_score",
    _score: "_score",
    datePosted: "datePosted",
    createdAt: "createdAt",
    updatedAt: "updatedAt",
    salary: "salary",
    salaryMin: "salaryMin",
    salaryMax: "salaryMax",
    experienceMin: "experienceMin",
    experienceMax: "experienceMax",
    title: "title.keyword",
    status: "status",
    workType: "workType",
  };

  private buildSort(sortBy?: string, sortDirection: "asc" | "desc" = "asc") {
    const direction: "asc" | "desc" = sortDirection === "desc" ? "desc" : "asc";

    const mappedSortField = sortBy ? this.sortableFields[sortBy] : undefined;

    if (mappedSortField === "salary") {
      return [
        {
          _script: {
            type: "number" as const,
            order: direction,
            script: {
              lang: "painless",
              source: `
                def hasMin = doc.containsKey('salaryMin') && doc['salaryMin'].size() > 0;
                def hasMax = doc.containsKey('salaryMax') && doc['salaryMax'].size() > 0;

                if (hasMin && hasMax) {
                  return (doc['salaryMin'].value + doc['salaryMax'].value) / 2.0;
                }
                if (hasMin) {
                  return doc['salaryMin'].value;
                }
                if (hasMax) {
                  return doc['salaryMax'].value;
                }
                return 0;
              `,
            },
          },
        },
        { _score: { order: "desc" as const } },
        { datePosted: { order: "desc" as const } },
      ];
    }

    if (mappedSortField === "date_posted") {
      return [
        {
          _script: {
            type: "number" as const,
            order: direction,
            script: {
              lang: "painless",
              source: `
                if (doc.containsKey('datePosted') && doc['datePosted'].size() > 0) {
                  return doc['datePosted'].value.toInstant().toEpochMilli();
                }
                if (doc.containsKey('createdAt') && doc['createdAt'].size() > 0) {
                  return doc['createdAt'].value.toInstant().toEpochMilli();
                }
                return 0;
              `,
            },
          },
        },
        { _score: { order: "desc" as const } },
        { datePosted: { order: "desc" as const } },
      ];
    }

    // Default ranking-first sort for relevance results.
    if (!mappedSortField) {
      return [
        { _score: { order: "desc" as const } },
        { id: { order: "asc" as const } }, // Stable tiebreaker for search_after cursor
      ];
    }

    if (mappedSortField === "_score") {
      return [
        { _score: { order: direction } },
        { id: { order: "asc" as const } }, // Stable tiebreaker for search_after cursor
      ];
    }

    return [
      { [mappedSortField]: { order: direction } },
      { _score: { order: "desc" as const } },
      { id: { order: "asc" as const } }, // Stable tiebreaker for search_after cursor
    ];
  }

  /**
   * Build Elasticsearch query for job matching với user profile
   * With custom scoring, I will calculate a relevance score based on:
   * - If it's a OR condition, I will plus score as long as any matching
   * - If it's a AND condition, I will calculate score based on how many conditions matched (skill match, location match, category match, experience match, salary match) and boost accordingly
   */
  buildMatchQuery(
    userProfile: UserProfile,
    filters: JobFilters,
    knnQuery?: any,
  ): any {
    const {
      skillIds = [],
      experienceYears = 0,
      provinceIds: userProvinceIds,
      categoryIds: userCategoryIds = [],
    } = userProfile;
    const {
      cursor,
      limit = 20,
      status,
      workType,
      provinceId: filterProvinceId,
      categoryId: filterCategoryId,
      salaryMin,
      salaryMax,
      skillIds: filterSkills,
      statuses,
      organizationId,
      experienceMin,
      experienceMax,
      fromDate,
      toDate,
      keyword,
      sortBy,
      sortDirection,
    } = filters;

    let searchAfter: any[] | undefined;
    if (cursor) {
      try {
        searchAfter = JSON.parse(Buffer.from(cursor, "base64").toString());
      } catch {
        this.logger.warn("Invalid cursor");
      }
    }

    const mustQueries: any[] = [
      // endDate filter: match jobs whose endDate >= today OR endDate is missing/null
      {
        bool: {
          should: [
            { range: { endDate: { gte: "now/d" } } },
            { bool: { must_not: { exists: { field: "endDate" } } } },
          ],
        },
      },
    ];

    const statusFilters = statuses?.length ? statuses : status ? [status] : [];

    if (statusFilters.length) {
      mustQueries.push({
        terms: { status: statusFilters },
      });
    }

    if (workType) {
      mustQueries.push({ term: { workType } });
    }

    if (filterProvinceId) {
      mustQueries.push({ term: { provinceIds: filterProvinceId } });
    }

    if (filterCategoryId) {
      mustQueries.push({ term: { categoryId: filterCategoryId } });
    }

    if (salaryMin !== undefined) {
      mustQueries.push({
        range: {
          salaryMax: {
            gte: salaryMin,
          },
        },
      });
    }

    if (salaryMax !== undefined) {
      mustQueries.push({
        range: {
          salaryMin: {
            lte: salaryMax,
          },
        },
      });
    }

    if ((filterSkills?.length || 0) > 0) {
      mustQueries.push({
        terms: {
          skillIds: filterSkills,
        },
      });
    }

    if (organizationId) {
      mustQueries.push({
        term: {
          organizationId,
        },
      });
    }

    if (experienceMin !== undefined || experienceMax !== undefined) {
      if (experienceMin !== undefined) {
        mustQueries.push({
          range: {
            experienceMax: { gte: experienceMin },
          },
        });
      }

      if (experienceMax !== undefined) {
        mustQueries.push({
          range: {
            experienceMin: { lte: experienceMax },
          },
        });
      }
    }

    if (fromDate || toDate) {
      const rangeQuery: any = {};
      if (fromDate) {
        rangeQuery.gte = fromDate;
      }
      if (toDate) {
        rangeQuery.lte = toDate;
      }
      mustQueries.push({
        range: {
          datePosted: rangeQuery,
        },
      });
    }

    if (keyword) {
      mustQueries.push({
        bool: {
          should: [
            { match: { title: { query: keyword, boost: 3.0 } } },
            { match: { description: { query: keyword, boost: 1.0 } } },
            { match: { skillNames: { query: keyword, boost: 2.0 } } },
            { match: { organizationName: { query: keyword, boost: 2.5 } } },
            { match: { categoryName: { query: keyword, boost: 1.8 } } },
            { match: { provinceNames: { query: keyword, boost: 1.3 } } },
          ],
          minimum_should_match: 1,
        },
      });
    }

    // Should queries cho matching (boost score)
    const shouldQueries: any[] = [];

    if (skillIds.length > 0) {
      shouldQueries.push({
        terms: {
          skillIds: skillIds,
          boost: 2.0, // Boost cho skill matching
        },
      });
    }

    if (userCategoryIds.length > 0) {
      shouldQueries.push({
        terms: {
          categoryId: userCategoryIds,
          boost: 1.5,
        },
      });
    }

    if (userProvinceIds.length > 0) {
      shouldQueries.push({
        terms: {
          provinceIds: userProvinceIds,
          boost: 3.0,
        },
      });
    }

    if (experienceYears !== undefined) {
      shouldQueries.push({
        range: {
          experienceMin: { lte: experienceYears, boost: 2.0 },
        },
      });
    }

    if (userProfile.expectedSalary) {
      shouldQueries.push({
        range: {
          salaryMin: { lte: userProfile.expectedSalary * 1.5, boost: 2.0 },
        },
      });
    }

    // Boost các job mới (gần hiện tại nhất) nếu người dùng không filter theo date
    if (!fromDate && !toDate) {
      shouldQueries.push(
        {
          distance_feature: {
            field: "createdAt",
            pivot: "10d",
            origin: "now/h", // Làm tròn theo giờ để tận dụng ES Query Cache
            boost: 10,
          },
        },
        {
          distance_feature: {
            field: "datePosted",
            pivot: "10d",
            origin: "now/h", // Làm tròn theo giờ để tận dụng ES Query Cache
            boost: 15,
          },
        },
      );
    }

    const mustNotQueries: any[] = [];
    if (filters.excludeJobIds && filters.excludeJobIds.length > 0) {
      mustNotQueries.push({
        terms: { id: filters.excludeJobIds },
      });
    }

    if (knnQuery) {
      knnQuery.filter = {
        bool: {
          must: mustQueries,
          must_not: mustNotQueries,
        },
      };
    }

    return {
      index: this.configService.get<string>("ELASTICSEARCH_INDEX_JOBS"),
      body: {
        query: {
          bool: {
            must: mustQueries,
            should: shouldQueries,
            must_not: mustNotQueries,
            minimum_should_match: keyword ? 1 : 0,
          },
        },
        sort: this.buildSort(sortBy, sortDirection),
        size: limit + 1,
        ...(searchAfter && { search_after: searchAfter }),
        ...(knnQuery && { knn: knnQuery }),
        _source: {
          includes: [
            "id",
            "title",
            "description",
            "organizationId",
            "organizationName",
            "skillIds",
            "skillNames",
            "provinceIds",
            "provinceNames",
            "salaryMin",
            "salaryMax",
            "experienceMin",
            "experienceMax",
            "workType",
            "status",
            "endDate",
            "datePosted",
            "createdAt",
            "updatedAt",
            "categoryId",
            "categoryName",
            "applyUrl",
            "questions",
          ],
        },
      },
    };
  }

  async getJobById(jobId: string): Promise<JobSearchDocument | null> {
    const index = this.configService.get<string>("ELASTICSEARCH_INDEX_JOBS")!;
    const response = await this.searchService.search(index, {
      query: { term: { id: jobId } },
    });
    return response?.hits?.hits?.[0]?._source ?? null;
  }

  private async getVectorsForJobs(
    jobIds: string[],
  ): Promise<Map<string, number[]>> {
    const index = this.configService.get<string>("ELASTICSEARCH_INDEX_JOBS")!;
    const response = await this.searchService.search(index, {
      _source: ["embedding", "id"],
      query: { terms: { id: jobIds } },
      size: jobIds.length,
    });

    const map = new Map<string, number[]>();
    for (const h of response?.hits?.hits ?? []) {
      if (h._source?.id && h._source?.embedding) {
        map.set(h._source.id, h._source.embedding);
      }
    }
    return map;
  }

  private averageVectors(
    recentInteractions: any[],
    vectorsMap: Map<string, number[]>,
  ): number[] {
    if (vectorsMap.size === 0) return [];

    // Determine vector dimension from the first valid vector
    const firstVector = Array.from(vectorsMap.values())[0];
    const dims = firstVector.length;

    const avg = new Array(dims).fill(0);
    let totalWeight = 0;

    for (const interaction of recentInteractions) {
      const vector = vectorsMap.get(interaction.jobId);
      if (!vector) continue;

      const weight = this.getEventWeight(interaction.eventType);
      totalWeight += Math.abs(weight);

      for (let i = 0; i < dims; i++) {
        avg[i] += vector[i] * weight;
      }
    }

    if (totalWeight === 0) return firstVector; // Fallback

    for (let i = 0; i < dims; i++) {
      avg[i] /= totalWeight;
    }
    return avg;
  }

  private getEventWeight(eventType: string): number {
    switch (eventType) {
      case "apply_job":
        return 3.0;
      case "save_job":
        return 2.0;
      case "share_job":
        return 1.5;
      case "click_job_recommendation":
        return 1.2;
      case "view_job_recommendation":
        return 1.1;
      case "view_job":
        return 1.0;
      case "unsave_job":
        return -1.0;
      default:
        return 1.0;
    }
  }

  async searchJobsLegacy(
    filters: JobFilters,
  ): Promise<PaginatedResult<JobSearchDocument>> {
    const { index, body } = this.buildSearchQueryLegacy(filters) as {
      index: string;
      body: any;
    };

    const response = await this.searchService.search(index, body);
    const hits = (response?.hits?.hits ?? []) as any[];

    const limit = filters.limit ?? 20;
    const hasMore = hits.length > limit;
    const actualHits = hasMore ? hits.slice(0, limit) : hits;

    let nextCursor: string | undefined;
    if (hasMore && actualHits.length > 0) {
      const searchAfter = actualHits[actualHits.length - 1]?.sort;
      if (Array.isArray(searchAfter)) {
        nextCursor = Buffer.from(JSON.stringify(searchAfter)).toString(
          "base64",
        );
      }
    }

    const docs: JobSearchDocument[] = actualHits
      .map((h) => h?._source)
      .filter((s): s is JobSearchDocument => Boolean(s?.id));

    return { data: docs, pagination: { nextCursor, hasNextPage: hasMore } };
  }

  private buildSearchQueryLegacy(filters: JobFilters): any {
    const {
      cursor,
      limit = 20,
      status,
      statuses,
      workType,
      provinceId,
      categoryId,
      keyword,
      skillIds,
      organizationId,
      salaryMin,
      salaryMax,
      experienceMin,
      experienceMax,
      fromDate,
      toDate,
      sortBy,
      sortDirection,
    } = filters;

    let searchAfter: any[] | undefined;
    if (cursor) {
      try {
        searchAfter = JSON.parse(Buffer.from(cursor, "base64").toString());
      } catch {
        this.logger.warn("Invalid cursor");
      }
    }

    const mustQueries: any[] = [
      // endDate filter: match jobs whose endDate >= today OR endDate is missing/null
      {
        bool: {
          should: [
            { range: { endDate: { gte: "now/d" } } },
            { bool: { must_not: { exists: { field: "endDate" } } } },
          ],
          minimum_should_match: 1,
        },
      },
    ];

    const statusFilters = statuses?.length ? statuses : status ? [status] : [];

    if (statusFilters.length) {
      mustQueries.push({
        terms: { status: statusFilters },
      });
    }
    if (workType) {
      mustQueries.push({ term: { workType } });
    }

    if (provinceId) {
      mustQueries.push({ term: { provinceIds: provinceId } });
    }

    if (categoryId) {
      mustQueries.push({ term: { categoryId } });
    }

    if (skillIds && skillIds.length > 0) {
      mustQueries.push({
        terms: {
          skillIds: skillIds,
        },
      });
    }

    if (organizationId) {
      mustQueries.push({
        term: {
          organizationId,
        },
      });
    }

    if (salaryMin !== undefined || salaryMax !== undefined) {
      if (salaryMin !== undefined) {
        mustQueries.push({
          range: {
            salaryMax: { gte: salaryMin },
          },
        });
      }

      if (salaryMax !== undefined) {
        mustQueries.push({
          range: {
            salaryMin: { lte: salaryMax },
          },
        });
      }
    }

    if (experienceMin !== undefined || experienceMax !== undefined) {
      if (experienceMin !== undefined) {
        mustQueries.push({
          range: {
            experienceMax: { gte: experienceMin },
          },
        });
      }

      if (experienceMax !== undefined) {
        mustQueries.push({
          range: {
            experienceMin: { lte: experienceMax },
          },
        });
      }
    }

    if (fromDate || toDate) {
      const datePostedRangeQuery: any = {};
      const createdAtRangeQuery: any = {};

      if (fromDate) {
        const fromDateIso = new Date(fromDate).toISOString();
        datePostedRangeQuery.gte = fromDateIso;
        createdAtRangeQuery.gte = fromDateIso;
      }

      if (toDate) {
        const toDateObj = new Date(toDate);
        toDateObj.setHours(23, 59, 59, 999);
        const toDateIso = toDateObj.toISOString();
        datePostedRangeQuery.lte = toDateIso;
        createdAtRangeQuery.lte = toDateIso;
      }

      mustQueries.push({
        bool: {
          should: [
            {
              range: {
                datePosted: datePostedRangeQuery,
              },
            },
            {
              bool: {
                must_not: {
                  exists: { field: "datePosted" },
                },
                filter: {
                  range: {
                    createdAt: createdAtRangeQuery,
                  },
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    }
    const shouldQueries: any[] = [];

    if (keyword) {
      shouldQueries.push(
        { match: { title: { query: keyword, boost: 3.0 } } },
        { match: { description: { query: keyword, boost: 1.0 } } },
        { match: { skillNames: { query: keyword, boost: 2.0 } } },
        { match: { organizationName: { query: keyword, boost: 2.5 } } },
        { match: { categoryName: { query: keyword, boost: 1.8 } } },
        { match: { provinceNames: { query: keyword, boost: 1.3 } } },
      );
    }

    return {
      index: this.configService.get<string>("ELASTICSEARCH_INDEX_JOBS"),
      body: {
        query: {
          bool: {
            must: mustQueries,
            should: shouldQueries,
            ...(keyword && { minimum_should_match: 1 }),
          },
        },
        sort: this.buildSort(sortBy, sortDirection),
        size: limit + 1,
        ...(searchAfter && { search_after: searchAfter }),
      },
    };
  }

  async matchJobsLegacy(
    userProfile: UserProfile,
    filters: JobFilters,
  ): Promise<PaginatedResult<JobSearchDocument>> {
    const { index, body } = this.buildMatchQueryLegacy(
      userProfile,
      filters,
    ) as {
      index: string;
      body: any;
    };

    const response = await this.searchService.search(index, body);
    const hits = (response?.hits?.hits ?? []) as any[];

    const limit = filters.limit ?? 20;
    const hasMore = hits.length > limit;
    const actualHits = hasMore ? hits.slice(0, limit) : hits;

    let nextCursor: string | undefined;
    if (hasMore && actualHits.length > 0) {
      const searchAfter = actualHits[actualHits.length - 1]?.sort;
      if (Array.isArray(searchAfter)) {
        nextCursor = Buffer.from(JSON.stringify(searchAfter)).toString(
          "base64",
        );
      }
    }

    const docs = actualHits.flatMap((h) => {
      const source = h?._source;
      if (!source?.id) return [];
      const score =
        typeof h?._score === "number"
          ? Number((h._score * 100).toFixed(2))
          : undefined;
      return [{ ...source, ...(typeof score === "number" ? { score } : {}) }];
    }) satisfies JobSearchDocument[];

    return { data: docs, pagination: { nextCursor, hasNextPage: hasMore } };
  }

  /**
   * Build Elasticsearch query for job matching vß╗¢i user profile
   * With custom scoring, I will calculate a relevance score based on:
   * - If it's a OR condition, I will plus score as long as any matching
   * - If it's a AND condition, I will calculate score based on how many conditions matched (skill match, location match, category match, experience match, salary match) and boost accordingly
   */
  buildMatchQueryLegacy(userProfile: UserProfile, filters: JobFilters): any {
    const {
      skillIds = [],
      experienceYears = 0,
      provinceIds: userProvinceIds,
      categoryIds: userCategoryIds = [],
    } = userProfile;
    const {
      cursor,
      limit = 20,
      status,
      workType,
      provinceId: filterProvinceId,
      categoryId: filterCategoryId,
      salaryMin,
      salaryMax,
      skillIds: filterSkills,
      statuses,
      organizationId,
      experienceMin,
      experienceMax,
      fromDate,
      toDate,
      keyword,
      sortBy,
      sortDirection,
    } = filters;

    let searchAfter: any[] | undefined;
    if (cursor) {
      try {
        searchAfter = JSON.parse(Buffer.from(cursor, "base64").toString());
      } catch {
        this.logger.warn("Invalid cursor");
      }
    }

    const mustQueries: any[] = [
      // endDate filter: match jobs whose endDate >= today OR endDate is missing/null
      {
        bool: {
          should: [
            { range: { endDate: { gte: "now/d" } } },
            { bool: { must_not: { exists: { field: "endDate" } } } },
          ],
        },
      },
    ];

    const statusFilters = statuses?.length ? statuses : status ? [status] : [];

    if (statusFilters.length) {
      mustQueries.push({
        terms: { status: statusFilters },
      });
    }

    if (workType) {
      mustQueries.push({ term: { workType } });
    }

    if (filterProvinceId) {
      mustQueries.push({ term: { provinceIds: filterProvinceId } });
    }

    if (filterCategoryId) {
      mustQueries.push({ term: { categoryId: filterCategoryId } });
    }

    if (salaryMin !== undefined) {
      mustQueries.push({
        range: {
          salaryMax: {
            gte: salaryMin,
          },
        },
      });
    }

    if (salaryMax !== undefined) {
      mustQueries.push({
        range: {
          salaryMin: {
            lte: salaryMax,
          },
        },
      });
    }

    if ((filterSkills?.length || 0) > 0) {
      mustQueries.push({
        terms: {
          skillIds: filterSkills,
        },
      });
    }

    if (organizationId) {
      mustQueries.push({
        term: {
          organizationId,
        },
      });
    }

    if (experienceMin !== undefined || experienceMax !== undefined) {
      if (experienceMin !== undefined) {
        mustQueries.push({
          range: {
            experienceMax: { gte: experienceMin },
          },
        });
      }

      if (experienceMax !== undefined) {
        mustQueries.push({
          range: {
            experienceMin: { lte: experienceMax },
          },
        });
      }
    }

    if (fromDate || toDate) {
      const rangeQuery: any = {};
      if (fromDate) {
        rangeQuery.gte = fromDate;
      }
      if (toDate) {
        rangeQuery.lte = toDate;
      }
      mustQueries.push({
        range: {
          datePosted: rangeQuery,
        },
      });
    }

    if (keyword) {
      mustQueries.push({
        bool: {
          should: [
            { match: { title: { query: keyword, boost: 3.0 } } },
            { match: { description: { query: keyword, boost: 1.0 } } },
            { match: { skillNames: { query: keyword, boost: 2.0 } } },
            { match: { organizationName: { query: keyword, boost: 2.5 } } },
            { match: { categoryName: { query: keyword, boost: 1.8 } } },
            { match: { provinceNames: { query: keyword, boost: 1.3 } } },
          ],
          minimum_should_match: 1,
        },
      });
    }

    // Should queries cho matching (boost score)
    const shouldQueries: any[] = [];

    if (skillIds.length > 0) {
      shouldQueries.push({
        terms: {
          skillIds: skillIds,
          boost: 2.0, // Boost cho skill matching
        },
      });
    }

    if (userCategoryIds.length > 0) {
      shouldQueries.push({
        terms: {
          categoryId: userCategoryIds,
        },
      });
    }

    // Function Score Query vß╗¢i custom scoring
    return {
      index: this.configService.get<string>("ELASTICSEARCH_INDEX_JOBS"),
      body: {
        query: {
          function_score: {
            query: {
              bool: {
                must: mustQueries,
                should: shouldQueries,
                minimum_should_match: shouldQueries.length > 0 ? 1 : 0,
              },
            },
            functions: [
              // 1. Skill Match Score (40%)
              ...(skillIds.length > 0
                ? [
                    {
                      filter: {
                        terms: {
                          skillIds: skillIds,
                        },
                      },
                      weight: 0.4,
                      script_score: {
                        script: {
                          source: `
                            if (params.userSkillIds.length == 0) {
                              return 0;
                            }
                            
                            if (!doc.containsKey('skillIds') || doc['skillIds'].size() == 0) {
                              return 1;
                            }
                            
                            double matchedSkills = 0;
                            double totalSkills = doc['skillIds'].size();
                            
                            for (def skillId : params.userSkillIds) {
                              if (doc['skillIds'].contains(skillId)) {
                                matchedSkills++;
                              }
                            }
                            
                            return matchedSkills / totalSkills;
                          `,
                          params: {
                            userSkillIds: skillIds,
                          },
                        },
                      },
                    },
                  ]
                : []),
              // 2. Experience Match Score (25%)
              {
                weight: 0.25,
                script_score: {
                  script: {
                    source: `
                      long expMin = 0;
                      long expMax = 999;
                      long userExp = params.userExperienceYears;
                      
                      if (doc.containsKey('experienceMin') && doc['experienceMin'].size() > 0) {
                        expMin = doc['experienceMin'].value;
                      }
                      if (doc.containsKey('experienceMax') && doc['experienceMax'].size() > 0) {
                        expMax = doc['experienceMax'].value;
                      }
                      
                      if (userExp >= expMax) {
                        return 1; // Overqualified - still good match
                      } else if (userExp >= expMin) {
                        return 0.8; // Perfect match
                      } else if (userExp >= (long)(expMin * 0.7)) {
                        return 0.5; // Close match
                      } else {
                        return 0.2; // Underqualified
                      }
                    `,
                    params: {
                      userExperienceYears: experienceYears,
                    },
                  },
                },
              },
              // 3. Location Match Score (15%)
              ...(userProvinceIds.length > 0
                ? [
                    {
                      script_score: {
                        script: {
                          source: `
                            double total = params.userProvinceIds.length;
                        
                            for (def p : params.userProvinceIds) {
                              if (doc['provinceIds'].contains(p)) {
                                return 1;
                              }
                            }

                            return 0;
                          `,
                          params: {
                            userProvinceIds: userProvinceIds,
                          },
                        },
                      },
                      weight: 0.15,
                    },
                  ]
                : []),
              // 4. Category Match Score (10%)
              ...(userCategoryIds.length > 0
                ? [
                    {
                      script_score: {
                        script: {
                          source: `
                            double matched = 0;
                            double total = doc['categoryId'].size();
                        
                            if (total == 0) return 1; // No category info - neutral score

                            for (def p : params.userCategoryIds) {
                              if (doc['categoryId'].contains(p)) {
                                matched++;
                              }
                            }

                            return matched / total;
                          `,
                          params: {
                            userCategoryIds: userCategoryIds,
                          },
                        },
                      },
                      weight: 0.1,
                    },
                  ]
                : []),
              // 5. Salary Match Score (10%) - nß║┐u c├│ expected salary
              ...(userProfile.expectedSalary
                ? [
                    {
                      weight: 0.1,
                      script_score: {
                        script: {
                          source: `
                            double salaryMin = 0;
                            double salaryMax = 0;
                            
                            if (doc.containsKey('salaryMin') && doc['salaryMin'].size() > 0) {
                              salaryMin = doc['salaryMin'].value;
                            }
                            if (doc.containsKey('salaryMax') && doc['salaryMax'].size() > 0) {
                              salaryMax = doc['salaryMax'].value;
                            }
                            
                            if (salaryMin == 0 && salaryMax == 0) {
                              return 0.5; // No salary info - neutral score
                            }
                            
                            double jobSalary = (salaryMin + salaryMax) / 2;
                            if (jobSalary == 0) {
                              jobSalary = salaryMax > 0 ? salaryMax : salaryMin;
                            }
                            
                            double userExpected = params.userExpectedSalary;
                            
                            if (userExpected <= jobSalary * 1.2) {
                              return 1; // Within 20% - perfect
                            } else if (userExpected <= jobSalary * 1.5) {
                              return 0.7; // Within 50% - acceptable
                            } else {
                              return 0.3; // Too high
                            }
                          `,
                          params: {
                            userExpectedSalary: userProfile.expectedSalary,
                          },
                        },
                      },
                    },
                  ]
                : []),
            ],
            score_mode: "sum", // Sum all function scores
            boost_mode: "replace", // Sum vß╗¢i query score
          },
        },
        sort: this.buildSort(sortBy, sortDirection),
        size: limit + 1,
        ...(searchAfter && { search_after: searchAfter }),
        _source: {
          includes: [
            "id",
            "title",
            "description",
            "organizationId",
            "organizationName",
            "skillIds",
            "skillNames",
            "provinceIds",
            "provinceNames",
            "salaryMin",
            "salaryMax",
            "experienceMin",
            "experienceMax",
            "workType",
            "status",
            "endDate",
            "datePosted",
            "createdAt",
            "updatedAt",
            "categoryId",
            "categoryName",
            "applyUrl",
            "questions",
          ],
        },
      },
    };
  }
}
