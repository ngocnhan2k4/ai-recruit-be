import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserProfile, JobFilters } from "@/core/entities";

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
    const {
      skillIds = [],
      experienceYears = 0,
      provinceIds: userProvinceIds = [],
      categoryIds: userCategoryIds = [],
      expectedSalary,
    } = userProfile;

    const {
      cursor,
      limit = 20,
      status = "active",
      workType,
      provinceIds: filterProvinceIds,
      categoryId,
      salaryMin,
      salaryMax,
    } = filters;

    // search_after
    let searchAfter: any[] | undefined;
    if (cursor) {
      try {
        searchAfter = JSON.parse(Buffer.from(cursor, "base64").toString());
      } catch {
        this.logger.warn("Invalid cursor");
      }
    }

    const must: any[] = [
      { term: { status } },
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

    if (workType) must.push({ term: { workType } });
    if (filterProvinceIds?.length)
      must.push({ terms: { provinceIds: filterProvinceIds } });
    if (categoryId) must.push({ term: { categoryId } });

    if (salaryMin !== undefined)
      must.push({ range: { salaryMax: { gte: salaryMin } } });

    if (salaryMax !== undefined)
      must.push({ range: { salaryMin: { lte: salaryMax } } });

    const should: any[] = [];

    if (skillIds.length) {
      should.push({
        terms: { skillIds, boost: 2 },
      });
    }

    if (userCategoryIds.length) {
      should.push({
        terms: { categoryIds: userCategoryIds },
      });
    }

    const functions: any[] = [];

    if (skillIds.length) {
      functions.push({
        filter: { terms: { skillIds } },
        script_score: {
          script: {
            params: { userSkillIds: skillIds },
            source: `
              double matched = 0;
              double total = doc['skillIds'].size();
              if (total == 0) return 0;

              for (def s : params.userSkillIds) {
                if (doc['skillIds'].contains(s)) matched++;
              }

              double ratio = matched / total;
              double score = ratio * 100;
              if (matched == total) score += 20;

              return Math.min(score, 100) * 0.4;
            `,
          },
        },
      });
    }

    functions.push({
      script_score: {
        script: {
          params: { exp: experienceYears },
          source: `
            int min = doc['experienceMin'].size() > 0 ? doc['experienceMin'].value : 0;
            int max = doc['experienceMax'].size() > 0 ? doc['experienceMax'].value : 999;
            int u = params.exp;

            double score;
            if (min == 0 && max == 999) score = 50;
            else if (u >= max) score = 100;
            else if (u >= min) score = 80;
            else if (u >= min * 0.7) score = 50;
            else score = 20;

            return score * 0.25;
          `,
        },
      },
    });

    if (userProvinceIds.length) {
      functions.push({
        filter: { terms: { provinceIds: userProvinceIds } },
        weight: 15,
      });
    }

    if (userCategoryIds.length) {
      functions.push({
        filter: { terms: { categoryIds: userCategoryIds } },
        weight: 5,
      });
    }

    if (expectedSalary) {
      functions.push({
        script_score: {
          script: {
            params: { expectedSalary },
            source: `
              if (doc['salaryAvg'].size() == 0) return 50 * 0.1;

              double job = doc['salaryAvg'].value;
              double u = params.expectedSalary;

              double score;
              if (u <= job * 1.2) score = 100;
              else if (u <= job * 1.5) score = 70;
              else score = 30;

              return score * 0.1;
            `,
          },
        },
      });
    }

    return {
      index: this.configService.get<string>("ELASTICSEARCH_INDEX_JOBS"),
      body: {
        query: {
          function_score: {
            query: {
              bool: { must, should },
            },
            functions,
            score_mode: "sum",
            boost_mode: "multiply",
          },
        },
        sort: [{ _score: "desc" }, { createdAt: "desc" }],
        size: limit + 1,
        ...(searchAfter && { search_after: searchAfter }),
        _source: {
          includes: [
            "id",
            "title",
            "organizationName",
            "skillNames",
            "provinceNames",
            "salaryMin",
            "salaryMax",
            "experienceMin",
            "experienceMax",
            "workType",
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
