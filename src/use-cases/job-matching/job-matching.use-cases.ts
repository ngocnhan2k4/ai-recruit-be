import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  IMessageQueueService,
  IJobRepository,
  IUserRepository,
  ISearchService,
  IOrganizationRepository,
} from "@/core";
import {
  EmailJobType,
  Job,
  Province,
  Skill,
  Category,
  OrganizationWithDetails,
} from "@/core/entities";
import { JobFilters, JobResponse } from "@/core/entities/job.entity";
import { subDays } from "date-fns/subDays";
import { JobMatchingQuery } from "@/frameworks/data-services/elasticsearch/queries/job-matching.query";
import { RESPONSE_CODE } from "@/common/constants";
import { PaginatedResult } from "@/common/types";
import {
  ApiResponse,
  JobMatchResultDto,
  OrganizationWithDetailsDto,
} from "@/interfaces/dtos";
import { Dictionary, keyBy } from "lodash";

@Injectable()
export class JobMatchingUseCases {
  private readonly logger = new Logger(JobMatchingUseCases.name);

  constructor(
    private readonly jobRepository: IJobRepository,
    private readonly messageQueueService: IMessageQueueService,
    private readonly userRepository: IUserRepository,
    private readonly searchService: ISearchService,
    private readonly jobMatchingQuery: JobMatchingQuery,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async sendJobRecommendationsToUsers(): Promise<void> {
    this.logger.log("Starting job recommendations email process...");

    try {
      const usersWithAppliedJobs =
        await this.jobRepository.getUsersWithAppliedJobs();

      this.logger.log(
        `Found ${usersWithAppliedJobs.length} users with applied jobs`,
      );

      for (const user of usersWithAppliedJobs) {
        try {
          const recommendedJobs = await this.jobRepository.findRecommendedJobs(
            user.userId,
            user.appliedJobIds,
            user.skillIds,
            user.categoryIds,
            subDays(new Date(), 3).toISOString(),
            new Date().toISOString(),
            true,
            20,
          );

          if (recommendedJobs.length === 0) {
            this.logger.debug(
              `No recommended jobs found for user ${user.userId}`,
            );
            continue;
          }

          await this.messageQueueService.addEmail(
            EmailJobType.JOB_RECOMMENDATIONS,
            {
              to: user.email,
              userName: user.name,
              jobs: recommendedJobs.slice(0, 10),
            },
            {
              attempts: 3,
              backoff: {
                type: "exponential",
                delay: 5000,
              },
            },
          );
          this.logger.log(
            `Queued job recommendations email for user ${user.userId} with ${recommendedJobs.length} jobs`,
          );
        } catch (error) {
          this.logger.error(
            `Error processing user ${user.userId}: ${error.message}`,
            error.stack,
          );
        }
      }

      this.logger.log("Job recommendations email process completed");
    } catch (error) {
      this.logger.error(
        `Error in sendJobRecommendationsToUsers: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Get matched jobs with scores from Elasticsearch based on user profile
   * @param userId - User ID
   * @param filters - Job filters
   * @returns List of matched jobs with scores
   */
  async getMatchedJobsWithScores(
    userId: string,
    filters: JobFilters,
  ): Promise<ApiResponse<PaginatedResult<JobMatchResultDto>>> {
    this.logger.log(`Getting matched jobs for user ${userId}`);

    const userProfile = await this.userRepository.getUserProfile(userId);
    if (!userProfile) {
      throw new NotFoundException({
        message: `User ${userId} not found`,
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
    }

    const esQuery = this.jobMatchingQuery.buildMatchQuery(userProfile, filters);

    // Execute query
    const response = await this.searchService.search(
      esQuery.index as string,
      esQuery.body,
    );

    // Check if we got more results than requested (to determine hasMore)
    const hits = response.hits.hits;
    const hasMore = hits.length > filters.limit;
    const actualHits = hasMore ? hits.slice(0, filters.limit) : hits;

    // Extract job IDs for batch query
    const jobIds: string[] = [];
    const orgIds: string[] = [];

    for (const hit of actualHits) {
      const source = hit._source;
      jobIds.push(source.id);
      const orgId = source.organizationId;
      if (typeof orgId === "string" && orgId.length > 0) orgIds.push(orgId);
    }

    const uniqueOrgIds = [...new Set<string>(orgIds)];

    const [userJobStatusMap, organizations, jobInfos] = await Promise.all([
      jobIds.length > 0 && filters.user?.userId
        ? await this.jobRepository.getUserJobStatuses(
            filters.user?.userId,
            jobIds,
          )
        : Promise.resolve(new Map()),
      this.organizationRepository.getByIds(uniqueOrgIds, [
        "id",
        "name",
        "description",
        "websiteUrl",
        "employeesMin",
        "employeesMax",
        "logoUrl",
      ]),
      this.jobRepository.getJobsV2({
        ids: jobIds,
        fields: ["jobRaw"],
        limit: 0, // No need
      }),
    ]);
    const organizationMap = keyBy(organizations, "id");
    const jobMap = keyBy(jobInfos.data, "job.id");

    // Transform ES results to JobMatchResult (extends JobResponse)
    const jobs = this.convertHitToDto(
      actualHits,
      organizationMap,
      userJobStatusMap,
      jobMap,
    );

    // Generate next cursor if there are more results
    let nextCursor: string | undefined;
    if (hasMore) {
      const lastHit = actualHits[actualHits.length - 1];
      const searchAfter = lastHit.sort;
      nextCursor = Buffer.from(JSON.stringify(searchAfter)).toString("base64");
    }

    this.logger.log(
      `Found ${jobs.length} matched jobs for user ${userId}, hasMore: ${hasMore}`,
    );

    return {
      data: {
        data: jobs,
        pagination: {
          nextCursor,
          hasNextPage: hasMore,
        },
      },
      message: "Successfully retrieved matched jobs",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  private convertHitToDto(
    actualHits: any,
    organizationMap: Dictionary<OrganizationWithDetails>,
    userJobStatusMap: Map<
      string,
      {
        isSaved: boolean;
        isApplied: boolean;
        applyStatus: string | null;
        applyId: string | null;
      }
    >,
    jobMap: Dictionary<JobResponse>,
  ): JobMatchResultDto[] {
    return actualHits.map((hit: any) => {
      const source = hit._source;

      // Transform provinces
      const provinces: Province[] = (source.provinceIds || []).map(
        (id: string, index: number) => ({
          id,
          name: source.provinceNames?.[index] || null,
        }),
      );

      // Transform skills
      const skills: Skill[] = (source.skillIds || []).map(
        (id: string, index: number) => ({
          id,
          name: source.skillNames?.[index] || null,
        }),
      );

      // Transform organization
      const organization = organizationMap[source.organizationId] || {
        id: source.organizationId,
        name: source.organizationName || "",
      };

      const category: Category = {
        id: source.categoryId,
        name: source.categoryName || null,
      };

      // Transform job - datePosted/endDate are date strings, not Date objects
      const job: Job = {
        id: source.id,
        title: source.title,
        description: source.description,
        organizationId: source.organizationId,
        salaryMin: source.salaryMin?.toString() || null,
        salaryMax: source.salaryMax?.toString() || null,
        experienceMin: source.experienceMin,
        experienceMax: source.experienceMax,
        workType: source.workType,
        status: source.status || "active",
        datePosted: source.datePosted || null,
        endDate: source.endDate || null,
        jobRawId: null,
        rejectReason: null,
        categoryId: source.categoryId || source.categoryIds?.[0] || null,
        createdAt: source.createdAt
          ? new Date(source.createdAt as string)
          : new Date(),
        updatedAt: source.updatedAt
          ? new Date(source.updatedAt as string)
          : new Date(),
        deletedAt: null,
        questions: source.questions,
      };

      const jobStatus = userJobStatusMap.get(job.id) || {
        isSaved: false,
        isApplied: false,
        applyStatus: null,
        applyId: null,
        applyUrl: null,
      };

      return {
        job,
        provinces,
        organization: organization as OrganizationWithDetailsDto,
        skills,
        category,
        isSaved: jobStatus.isSaved,
        isApplied: jobStatus.isApplied,
        applyStatus: jobStatus.applyStatus || undefined,
        applyId: jobStatus.applyId || undefined,
        applyUrl: jobMap[job.id]?.applyUrl,
        score: Number((hit._score * 100).toFixed(2)),
      } as JobMatchResultDto;
    });
  }
}
