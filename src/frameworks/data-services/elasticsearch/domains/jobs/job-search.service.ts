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
    const hasSearchOrFiltersLocal = !!(
      filters.keyword ||
      filters.categoryId ||
      (filters.skillIds && filters.skillIds.length > 0)
    );

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
          k: (filters.limit ?? 20) + (!hasSearchOrFiltersLocal ? 70 : 20),
          num_candidates: !hasSearchOrFiltersLocal ? 400 : 100,
          boost: !hasSearchOrFiltersLocal ? 20.0 : 10.0,
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

    if (!fromDate && !toDate) {
      shouldQueries.push(
        {
          bool: {
            should: [
              { range: { datePosted: { gte: "now-15d/d" } } },
              {
                bool: {
                  must_not: { exists: { field: "datePosted" } },
                  filter: { range: { createdAt: { gte: "now-15d/d" } } },
                },
              },
            ],
            boost: 25.0,
          },
        },
        {
          bool: {
            should: [
              { range: { datePosted: { gte: "now-30d/d" } } },
              {
                bool: {
                  must_not: { exists: { field: "datePosted" } },
                  filter: { range: { createdAt: { gte: "now-30d/d" } } },
                },
              },
            ],
            boost: 20.0,
          },
        },
        {
          bool: {
            should: [
              { range: { datePosted: { gte: "now-60d/d" } } },
              {
                bool: {
                  must_not: { exists: { field: "datePosted" } },
                  filter: { range: { createdAt: { gte: "now-60d/d" } } },
                },
              },
            ],
            boost: 15.0,
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
      mustQueries.push({
        bool: {
          should: [
            { match: { title: { query: keyword, boost: 10.0 } } },
            { match: { description: { query: keyword, boost: 3.0 } } },
            { match: { skillNames: { query: keyword, boost: 5.0 } } },
            { match: { organizationName: { query: keyword, boost: 3.0 } } },
            { match: { categoryName: { query: keyword, boost: 5.0 } } },
            { match: { provinceNames: { query: keyword, boost: 2.0 } } },
          ],
          minimum_should_match: 1,
        },
      });
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
          // Freshness filter: chỉ tìm KNN candidates trong 90 ngày gần nhất
          // Đảm bảo pool candidates vừa liên quan vừa mới
          ...(!fromDate && !toDate
            ? {
                should: [
                  { range: { datePosted: { gte: "now-90d/d" } } },
                  {
                    bool: {
                      must_not: { exists: { field: "datePosted" } },
                      filter: {
                        range: { createdAt: { gte: "now-90d/d" } },
                      },
                    },
                  },
                ],
                minimum_should_match: 1,
              }
            : {}),
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

    if (mappedSortField === "datePosted") {
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

  async matchJobs(
    userProfile: UserProfile,
    filters: JobFilters,
  ): Promise<PaginatedResult<JobSearchDocument>> {
    const { index, body } = this.buildMatchQuery(userProfile, filters) as {
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

      let dateBoost = 0;
      if (!filters.toDate && !filters.fromDate) {
        let dateMillis = 0;
        if (source.datePosted) {
          dateMillis = new Date(source.datePosted).getTime();
        } else if (source.createdAt) {
          dateMillis = new Date(source.createdAt).getTime();
        }

        if (dateMillis > 0) {
          const ageInDays = (Date.now() - dateMillis) / (1000 * 60 * 60 * 24);
          if (ageInDays <= 15) dateBoost = 0.2;
          else if (ageInDays <= 30) dateBoost = 0.15;
          else if (ageInDays <= 60) dateBoost = 0.1;
          else dateBoost = 0.02;
        }
      }

      const score =
        typeof h?._score === "number"
          ? Number((Math.min(h._score - dateBoost, 1) * 100).toFixed(2))
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
  buildMatchQuery(userProfile: UserProfile, filters: JobFilters): any {
    const {
      skillIds = [],
      experienceYears = 0,
      provinceIds: userProvinceIds,
      categoryIds: userCategoryIds = [],
      skillNames = [],
      categoryNames = [],
    } = userProfile;

    const matchTerms = [...skillNames, ...categoryNames]
      .filter(Boolean)
      .join(" ");

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
            { match: { title: { query: keyword, boost: 10.0 } } },
            { match: { description: { query: keyword, boost: 3.0 } } },
            { match: { skillNames: { query: keyword, boost: 5.0 } } },
            { match: { organizationName: { query: keyword, boost: 3.0 } } },
            { match: { categoryName: { query: keyword, boost: 5.0 } } },
            { match: { provinceNames: { query: keyword, boost: 2.0 } } },
          ],
          minimum_should_match: 1,
        },
      });
    }

    // Profile-based should queries — intentionally empty.
    // Keyword is already in mustQueries (strict filter).
    // Profile skill/category matching is handled by function_score functions below (scoring only, no filtering).
    const shouldQueries: any[] = [];
    // Function Score Query với custom scoring
    return {
      index: this.configService.get<string>("ELASTICSEARCH_INDEX_JOBS"),
      body: {
        query: {
          function_score: {
            query: {
              bool: {
                must: mustQueries,
                should: shouldQueries,
                minimum_should_match: 0,
              },
            },
            functions: [
              // 1. Skill Match Score (25%)
              ...(skillIds.length > 0
                ? [
                    {
                      filter: {
                        terms: {
                          skillIds: skillIds,
                        },
                      },
                      weight: 0.25,
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
                : [
                    {
                      weight: 0.15,
                      script_score: {
                        script: {
                          source: "return 1.0;",
                        },
                      },
                    },
                  ]),
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
                : [
                    {
                      weight: 0.1,
                      script_score: {
                        script: {
                          source: "return 1.0;",
                        },
                      },
                    },
                  ]),
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
                : [
                    {
                      weight: 0.1,
                      script_score: {
                        script: {
                          source: "return 1.0;",
                        },
                      },
                    },
                  ]),
              // 6. Freshness Score (Bonus up to 20%)
              ...(!fromDate && !toDate
                ? [
                    {
                      weight: 0.2,
                      script_score: {
                        script: {
                          source: `
                            long dateMillis = 0;
                            if (doc.containsKey('datePosted') && doc['datePosted'].size() > 0) {
                              dateMillis = doc['datePosted'].value.toInstant().toEpochMilli();
                            } else if (doc.containsKey('createdAt') && doc['createdAt'].size() > 0) {
                              dateMillis = doc['createdAt'].value.toInstant().toEpochMilli();
                            }
                            
                            if (dateMillis == 0) return 0;
                            
                            long now = new Date().getTime();
                            long ageInDays = (now - dateMillis) / (1000 * 60 * 60 * 24);
                            
                            if (ageInDays <= 15) return 1.0;
                            if (ageInDays <= 30) return 0.75;
                            if (ageInDays <= 60) return 0.5;
                            return 0.1;
                          `,
                        },
                      },
                    },
                  ]
                : []),
              // 7. Semantic Name Match Score (Bonus)
              ...(matchTerms.length > 0
                ? [
                    {
                      filter: {
                        multi_match: {
                          query: matchTerms,
                          fields: ["title^2", "description"],
                        },
                      },
                      weight: 0.15, // 15% bonus for semantic match
                    },
                  ]
                : []),
            ],
            score_mode: "sum", // Sum all function scores
            boost_mode: keyword ? "multiply" : "replace", // When keyword: multiply native relevance × profile score; When no keyword: profile score only
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
}
