import { JobFilters } from "@/core/entities/job.entity";
import { JOB_INDEX_NAME } from "../indices/job.index";

export interface UserProfile {
  userId: string;
  skillIds: string[];
  experienceYears: number;
  provinceIds: string[];
  categoryIds?: string[];
  expectedSalary?: number;
}

export class JobMatchingQuery {
  /**
   * Build Elasticsearch query for job matching với user profile
   */
  static buildMatchQuery(userProfile: UserProfile, filters: JobFilters): any {
    const {
      skillIds = [],
      experienceYears = 0,
      provinceIds: userProvinceIds,
      categoryIds: userCategoryIds = [],
    } = userProfile;

    const {
      page = 1,
      limit = 20,
      status = "active",
      workType,
      provinceIds: filterProvinceIds,
      categoryId: filterCategoryId,
      salaryMin,
      salaryMax,
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
      index: JOB_INDEX_NAME,
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
                      int expMin = doc['experienceMin'].size() > 0 ? doc['experienceMin'].value : 0;
                      int expMax = doc['experienceMax'].size() > 0 ? doc['experienceMax'].value : 999;
                      int userExp = params.userExperienceYears;
                      
                      if (userExp >= expMax) {
                        return 100; // Overqualified - still good match
                      } else if (userExp >= expMin) {
                        return 80; // Perfect match
                      } else if (userExp >= expMin * 0.7) {
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
                        term: {
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
                            if (doc['salaryAvg'].size() == 0) {
                              return 50; // No salary info - neutral score
                            }
                            
                            double jobSalary = doc['salaryAvg'].value;
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
        size: limit,
        from: (page - 1) * limit,
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
   */
  static buildSearchQuery(searchTerm: string, filters: JobFilters): any {
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
      index: JOB_INDEX_NAME,
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
