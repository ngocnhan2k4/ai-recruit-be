import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserProfile, JobFilters } from "@/core/entities";

@Injectable()
export class JobMatchingQuery {
  private readonly logger = new Logger(JobMatchingQuery.name);

  constructor(private readonly configService: ConfigService) {}

  /**
   * Build Elasticsearch query for job matching với user profile
   */
  buildMatchQuery(userProfile: UserProfile, filters: JobFilters): any {
    const {
      skillIds = [],
      experienceYears = 0,
      provinceIds: userProvinceIds,
      categoryIds: userCategoryIds = [],
    } = userProfile;

    const {
      cursor,
      limit = 20,
      status = "active",
      workType,
      provinceIds: filterProvinceIds,
      categoryId: filterCategoryId,
      salaryMin,
      salaryMax,
      skillId: filterSkill,
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
      { term: { status } },
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

    if (workType) {
      mustQueries.push({ terms: { workType } });
    }

    if (filterProvinceIds && filterProvinceIds.length > 0) {
      mustQueries.push({ terms: { provinceIds: filterProvinceIds } });
    }

    if (filterCategoryId) {
      mustQueries.push({ terms: { categoryId: filterCategoryId } });
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

    if (filterSkill) {
      mustQueries.push({
        term: {
          skillIds: filterSkill,
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
          categoryIds: userCategoryIds,
        },
      });
    }

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
                // should queries only boost score, not filter
                minimum_should_match: 0,
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
                              return 0;
                            }
                            
                            double matchedSkills = 0;
                            double totalSkills = doc['skillIds'].size();
                            
                            for (def skillId : params.userSkillIds) {
                              if (doc['skillIds'].contains(skillId)) {
                                matchedSkills++;
                              }
                            }
                            
                            return (matchedSkills / totalSkills) * 100;
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
                        return 100; // Overqualified - still good match
                      } else if (userExp >= expMin) {
                        return 80; // Perfect match
                      } else if (userExp >= (long)(expMin * 0.7)) {
                        return 50; // Close match
                      } else {
                        return 20; // Underqualified
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
                      filter: {
                        terms: {
                          provinceIds: userProvinceIds,
                        },
                      },
                      weight: 15,
                    },
                  ]
                : []),
              // 4. Category Match Score (5%)
              ...(userCategoryIds.length > 0
                ? [
                    {
                      filter: {
                        terms: {
                          categoryIds: userCategoryIds,
                        },
                      },
                      weight: 15,
                    },
                  ]
                : []),
              // 5. Salary Match Score (10%) - nếu có expected salary
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
                              return 50; // No salary info - neutral score
                            }
                            
                            double jobSalary = (salaryMin + salaryMax) / 2;
                            if (jobSalary == 0) {
                              jobSalary = salaryMax > 0 ? salaryMax : salaryMin;
                            }
                            
                            double userExpected = params.userExpectedSalary;
                            
                            if (userExpected <= jobSalary * 1.2) {
                              return 100; // Within 20% - perfect
                            } else if (userExpected <= jobSalary * 1.5) {
                              return 70; // Within 50% - acceptable
                            } else {
                              return 30; // Too high
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
            boost_mode: "multiply", // Multiply với query score
          },
        },
        sort: [
          {
            _score: {
              order: "desc",
            },
          },
          {
            datePosted: {
              order: "desc",
            },
          },
        ],
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
            "categoryIds",
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
          ],
        },
      },
    };
  }

  /**
   * Build simple search query
   */
  buildSearchQuery(filters: JobFilters): any {
    const {
      cursor,
      limit = 20,
      status = "active",
      workType,
      provinceIds,
      categoryId,
      keyword,
      skillId,
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
      { term: { status } },
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

    if (workType) {
      mustQueries.push({ terms: { workType } });
    }

    if (provinceIds && provinceIds.length > 0) {
      mustQueries.push({ terms: { provinceIds: provinceIds } });
    }

    if (categoryId) {
      mustQueries.push({ terms: { categoryId } });
    }

    if (skillId) {
      mustQueries.push({
        term: {
          skillIds: skillId,
        },
      });
    }

    const shouldQueries: any[] = [];

    if (keyword) {
      shouldQueries.push(
        {
          match: {
            title: {
              query: keyword,
              boost: 3.0,
            },
          },
        },
        {
          match: {
            description: {
              query: keyword,
              boost: 1.0,
            },
          },
        },
        {
          match: {
            skillNames: {
              query: keyword,
              boost: 2.0,
            },
          },
        },
      );
    }

    return {
      index: this.configService.get<string>("ELASTICSEARCH_INDEX_JOBS"),
      body: {
        query: {
          bool: {
            must: mustQueries,
            should: shouldQueries,
            minimum_should_match: keyword ? 1 : 0,
          },
        },
        sort: [
          {
            _score: {
              order: "desc",
            },
          },
          {
            datePosted: {
              order: "desc",
            },
          },
        ],
        size: limit + 1,
        ...(searchAfter && { search_after: searchAfter }),
      },
    };
  }
}
