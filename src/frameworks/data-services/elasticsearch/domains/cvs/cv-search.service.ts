import { Injectable, Logger } from "@nestjs/common";
import { ICvSearchService, ISearchService } from "@/core/abstracts";
import { CvSearchDocument, CvSearchFilters } from "@/core/entities";
import { PaginatedResult } from "@/common/types";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CvSearchService implements ICvSearchService {
  private readonly logger = new Logger(CvSearchService.name);

  constructor(
    private readonly searchService: ISearchService,
    private readonly configService: ConfigService,
  ) {}

  async searchCvs(
    filters: CvSearchFilters,
  ): Promise<PaginatedResult<CvSearchDocument>> {
    if (!filters.userIds || filters.userIds.length === 0) {
      return {
        data: [],
        pagination: { hasNextPage: false, nextCursor: undefined },
      };
    }

    const { index, body } = this.buildSearchQuery(filters) as {
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

    const docs: CvSearchDocument[] = actualHits.flatMap((h) => {
      const source = h?._source;
      if (!source?.id || !source?.userId) return [];
      const score =
        typeof h?._score === "number"
          ? Number((h._score * 100).toFixed(2))
          : undefined;
      return [{ ...source, ...(typeof score === "number" ? { score } : {}) }];
    });

    return { data: docs, pagination: { nextCursor, hasNextPage: hasMore } };
  }

  private buildSearchQuery(filters: CvSearchFilters): any {
    const {
      cursor,
      limit = 20,
      userIds,
      keyword,
      skillIds,
      provinceIds,
      categoryId,
      experienceMin,
      experienceMax,
      salaryMin,
      salaryMax,
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

    const mustQueries: any[] = [{ terms: { userId: userIds } }];
    const shouldQueries: any[] = [];

    if ((skillIds?.length ?? 0) > 0) {
      shouldQueries.push({ terms: { skillIds, boost: 2.5 } });
    }

    if ((provinceIds?.length ?? 0) > 0) {
      shouldQueries.push({ terms: { provinceIds, boost: 1.2 } });
    }

    if (categoryId) {
      shouldQueries.push({
        term: { categoryIds: { value: categoryId, boost: 1.4 } },
      });
    }

    if (keyword) {
      shouldQueries.push(
        { match: { name: { query: keyword, boost: 3.0 } } },
        { match: { skillNames: { query: keyword, boost: 1.6 } } },
        { match: { categoryNames: { query: keyword, boost: 1.4 } } },
        { match: { provinceNames: { query: keyword, boost: 1.2 } } },
      );
    }

    const normalizedJobSalaryMax =
      typeof salaryMax === "number"
        ? salaryMax
        : salaryMax != null
          ? Number(salaryMax)
          : null;
    const normalizedJobSalaryMin =
      typeof salaryMin === "number"
        ? salaryMin
        : salaryMin != null
          ? Number(salaryMin)
          : null;

    const functions: any[] = [
      ...(skillIds && skillIds.length > 0
        ? [
            {
              weight: 0.4,
              script_score: {
                script: {
                  source: `
                    if (params.jobSkillIds.length == 0) return 0;
                    if (!doc.containsKey('skillIds') || doc['skillIds'].size() == 0) return 0;
                    double matched = 0;
                    for (def s : params.jobSkillIds) {
                      if (doc['skillIds'].contains(s)) {
                        matched++;
                      }
                    }
                    return matched / params.jobSkillIds.length;
                  `,
                  params: {
                    jobSkillIds: skillIds,
                  },
                },
              },
            },
          ]
        : []),
      {
        weight: 0.25,
        script_score: {
          script: {
            source: `
              long expMin = params.jobExpMin;
              long expMax = params.jobExpMax;
              long cvExp = 0;
              if (doc.containsKey('experienceYears') && doc['experienceYears'].size() > 0) {
                cvExp = doc['experienceYears'].value;
              }

              if (cvExp >= expMax) {
                return 1;
              } else if (cvExp >= expMin) {
                return 0.8;
              } else if (expMin > 0 && cvExp >= (long)(expMin * 0.7)) {
                return 0.5;
              } else {
                return 0.2;
              }
            `,
            params: {
              jobExpMin: Math.max(0, experienceMin ?? 0),
              jobExpMax: Math.max(
                experienceMin ?? 0,
                experienceMax ?? experienceMin ?? 0,
              ),
            },
          },
        },
      },
      ...(provinceIds && provinceIds.length > 0
        ? [
            {
              weight: 0.15,
              script_score: {
                script: {
                  source: `
                    if (!doc.containsKey('provinceIds') || doc['provinceIds'].size() == 0) {
                      return 0;
                    }
                    for (def p : params.jobProvinceIds) {
                      if (doc['provinceIds'].contains(p)) {
                        return 1;
                      }
                    }
                    return 0;
                  `,
                  params: {
                    jobProvinceIds: provinceIds,
                  },
                },
              },
            },
          ]
        : []),
      ...(categoryId
        ? [
            {
              weight: 0.1,
              script_score: {
                script: {
                  source: `
                    if (!doc.containsKey('categoryIds') || doc['categoryIds'].size() == 0) {
                      return 0;
                    }
                    return doc['categoryIds'].contains(params.jobCategoryId) ? 1 : 0;
                  `,
                  params: {
                    jobCategoryId: categoryId,
                  },
                },
              },
            },
          ]
        : []),
      {
        weight: 0.1,
        script_score: {
          script: {
            source: `
              double cvExpected = 0;
              if (doc.containsKey('expectedSalary') && doc['expectedSalary'].size() > 0) {
                cvExpected = doc['expectedSalary'].value;
              } else {
                return 1;
              }

              double jobMax = params.jobSalaryMax;
              if (jobMax <= 0) {
                return 1;
              }

              if (cvExpected <= jobMax * 1.2) {
                return 1;
              } else if (cvExpected <= jobMax * 1.5) {
                return 0.7;
              } else {
                return 0.3;
              }
            `,
            params: {
              jobSalaryMax:
                normalizedJobSalaryMax ?? normalizedJobSalaryMin ?? 0,
            },
          },
        },
      },
    ];

    return {
      index: this.configService.get<string>("ELASTICSEARCH_INDEX_CVS"),
      body: {
        query: {
          function_score: {
            query: {
              bool: {
                must: mustQueries,
                ...(shouldQueries.length > 0 ? { should: shouldQueries } : {}),
              },
            },
            functions,
            score_mode: "sum",
            boost_mode: "replace",
          },
        },
        sort: this.buildSort(sortBy, sortDirection),
        size: limit + 1,
        ...(searchAfter && { search_after: searchAfter }),
        _source: {
          includes: [
            "id",
            "userId",
            "name",
            "fileUrl",
            "mimeType",
            "skillIds",
            "skillNames",
            "provinceIds",
            "provinceNames",
            "categoryIds",
            "categoryNames",
            "experienceYears",
            "expectedSalary",
            "updatedAt",
          ],
        },
      },
    };
  }

  private buildSort(sortBy?: string, sortDirection: "asc" | "desc" = "desc") {
    const direction: "asc" | "desc" = sortDirection === "asc" ? "asc" : "desc";

    if (sortBy === "_score" || sortBy === "score") {
      return [
        { _score: { order: direction } },
        { updatedAt: { order: "desc" as const } },
      ];
    }

    if (sortBy === "updatedAt") {
      return [
        { updatedAt: { order: direction } },
        { _score: { order: "desc" as const } },
      ];
    }

    return [
      { _score: { order: "desc" as const } },
      { updatedAt: { order: "desc" as const } },
    ];
  }
}
