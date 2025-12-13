import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JobFilters } from "@/core/entities/job.entity";

export interface UserProfile {
  userId: string;
  skillIds: string[];
  experienceYears: number;
  provinceIds: string[];
  categoryIds?: string[];
  expectedSalary?: number;
}

@Injectable()
export class JobMatchingQuery {
  private readonly logger = new Logger(JobMatchingQuery.name);

  constructor(private readonly configService: ConfigService) {}
  /**
   * Build Elasticsearch query for job matching với user profile
   * @param indexName - Elasticsearch index name
   * @param userProfile - User profile for matching
   * @param filters - Additional filters
   */
  buildMatchQuery(userProfile: UserProfile, filters: JobFilters): any {
    this.logger.debug(
      `Building match query for user ${userProfile.userId} with ${userProfile.skillIds.length} skills`,
    );
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
    } = filters;

    // Decode cursor if provided
    let searchAfter: any[] | undefined;
    if (cursor) {
      try {
        searchAfter = JSON.parse(Buffer.from(cursor, "base64").toString());
      } catch (_e) {
        this.logger.warn(`Invalid cursor: ${cursor}`);
      }
    }

    const mustQueries: any[] = [
      { term: { status } },
      // endDate >= now OR endDate is null (jobs without end date are always valid)
      {
        bool: {
          should: [
            {
              range: {
                endDate: {
                  gte: "now/d",
                },
              },
            },
            {
              bool: {
                must_not: {
                  exists: {
                    field: "endDate",
                  },
                },
              },
            },
          ],
          minimum_should_match: 1,
        },
      },
    ];

    if (workType) {
      mustQueries.push({ term: { workType } });
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
      index: this.configService.get<string>("ELASTICSEARCH_INDEX_JOBS")!,
      body: {
        query: {
          function_score: {
            query: {
              bool: {
                must: mustQueries,
                should: shouldQueries,
                minimum_should_match: shouldQueries.length > 0 ? 0 : 0,
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
                            
                            double matchedSkills = 0;
                            double totalSkills = doc['skillIds'].size();
                            
                            if (totalSkills == 0) {
                              return 0;
                            }
                            
                            for (def skillId : params.userSkillIds) {
                              if (doc['skillIds'].contains(skillId)) {
                                matchedSkills++;
                              }
                            }
                            
                            double score = (matchedSkills / totalSkills) * 100;
                            
                            // Bonus cho nhiều skills match
                            if (matchedSkills == totalSkills) {
                              score += 20; // Perfect match bonus
                            }
                            
                            return Math.min(score, 100);
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
                      try {
                        int expMin = 0;
                        int expMax = 999;
                        
                        if (doc['experienceMin'].size() > 0) {
                          def val = doc['experienceMin'].value;
                          if (val != null) expMin = (int) val;
                        }
                        
                        if (doc['experienceMax'].size() > 0) {
                          def val = doc['experienceMax'].value;
                          if (val != null) expMax = (int) val;
                        }
                        
                        int userExp = params.userExperienceYears;
                        
                        if (expMin == 0 && expMax == 999) {
                          return 50;
                        }
                        
                        if (userExp >= expMax) {
                          return 100;
                        } else if (userExp >= expMin) {
                          return 80;
                        } else if (expMin > 0 && userExp >= expMin * 0.7) {
                          return 50;
                        } else {
                          return 20;
                        }
                      } catch (Exception e) {
                        return 0;
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
                      weight: 0.15,
                      boost_factor: 100,
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
                      weight: 0.05,
                      boost_factor: 100,
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
                            try {
                              if (doc['salaryAvg'].size() == 0) {
                                return 50;
                              }
                              
                              def val = doc['salaryAvg'].value;
                              if (val == null) {
                                return 50;
                              }
                              
                              double jobSalary = (double) val;
                              double userExpected = params.userExpectedSalary;
                              
                              if (jobSalary == 0) {
                                return 50;
                              }
                              
                              if (userExpected <= jobSalary * 1.2) {
                                return 100;
                              } else if (userExpected <= jobSalary * 1.5) {
                                return 70;
                              } else {
                                return 30;
                              }
                            } catch (Exception e) {
                              return 0;
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
            createdAt: {
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
            "datePosted",
            "createdAt",
          ],
        },
      },
    };
  }

  /**
   * Build simple search query (không có user profile)
   * @param indexName - Elasticsearch index name
   * @param searchTerm - Search term
   * @param filters - Additional filters
   */
  buildSearchQuery(
    indexName: string,
    searchTerm: string,
    filters: JobFilters,
  ): any {
    this.logger.debug(`Building search query with term: "${searchTerm}"`);
    const {
      page = 1,
      limit = 20,
      status = "active",
      workType,
      provinceIds,
      categoryId,
    } = filters;

    const mustQueries: any[] = [
      { term: { status } },
      {
        range: {
          endDate: {
            gte: "now/d",
          },
        },
      },
    ];

    if (workType) {
      mustQueries.push({ term: { workType } });
    }

    if (provinceIds && provinceIds.length > 0) {
      mustQueries.push({ terms: { provinceIds: provinceIds } });
    }

    if (categoryId) {
      mustQueries.push({ terms: { categoryId } });
    }

    const shouldQueries: any[] = [];

    if (searchTerm) {
      shouldQueries.push(
        {
          match: {
            title: {
              query: searchTerm,
              boost: 3.0,
            },
          },
        },
        {
          match: {
            description: {
              query: searchTerm,
              boost: 1.0,
            },
          },
        },
        {
          match: {
            skillNames: {
              query: searchTerm,
              boost: 2.0,
            },
          },
        },
      );
    }

    return {
      index: indexName,
      body: {
        query: {
          bool: {
            must: mustQueries,
            should: shouldQueries,
            minimum_should_match: searchTerm ? 1 : 0,
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
        size: limit,
        from: (page - 1) * limit,
      },
    };
  }
}
