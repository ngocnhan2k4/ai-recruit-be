import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  IMessageQueueService,
  IJobRepository,
  IUserRepository,
  IOrganizationRepository,
  IJobSearchService,
} from "@/core";
import {
  EmailJobType,
  Job,
  Province,
  Skill,
  Category,
  OrganizationWithDetails,
  JobRecommendationsEmailData,
} from "@/core/entities";
import { JobFilters } from "@/core/entities/job.entity";
import { subDays } from "date-fns/subDays";
import { RESPONSE_CODE } from "@/common/constants";
import { PaginatedResult } from "@/common/types";
import {
  ApiResponse,
  JobMatchResultDto,
  OrganizationWithDetailsDto,
} from "@/interfaces/dtos";
import { Dictionary, keyBy } from "lodash";
import { EventTrackingService } from "../event-tracking/event-tracking.service";
import { IBloomFilterService } from "@/core/abstracts";

@Injectable()
export class JobMatchingUseCases {
  private readonly logger = new Logger(JobMatchingUseCases.name);

  constructor(
    private readonly jobRepository: IJobRepository,
    private readonly messageQueueService: IMessageQueueService,
    private readonly userRepository: IUserRepository,
    private readonly jobSearchService: IJobSearchService,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly eventTrackingService: EventTrackingService,
    private readonly bloomFilterService: IBloomFilterService,
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
            } as JobRecommendationsEmailData,
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
          this.logger.error(`Error processing user ${user.userId}: ${error}`);
        }
      }

      this.logger.log("Job recommendations email process completed");
    } catch (error) {
      this.logger.error(`Error in sendJobRecommendationsToUsers: ${error}`);
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
    const userProfile = await this.userRepository.getUserProfile(userId);
    if (!userProfile) {
      throw new NotFoundException({
        message: `User ${userId} not found`,
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
    }

    // Tích hợp Soft boost từ sở thích người dùng và lịch sử
    const prefs = await this.eventTrackingService.getUserPreference(userId);
    if (prefs) {
      filters.userPreference = prefs;
    }
    const recentJobs =
      await this.eventTrackingService.getUserRecentInteractedJobs(userId);
    if (recentJobs && recentJobs.length > 0) {
      filters.recentInteractions = recentJobs;

      // Explicitly exclude these from recommendations to avoid recommending jobs the user already interacted with
      filters.excludeJobIds = recentJobs.map((r) => r.jobId);
    }

    // Load user's bloom filter to avoid duplicate recommendations
    const bloomKey = `user_seen_jobs:${userId}`;
    await this.bloomFilterService.loadFromRedis(bloomKey);

    const {
      data: rawDocs,
      pagination: { nextCursor, hasNextPage: hasMore },
    } = await this.jobSearchService.matchJobs(userProfile, filters);

    // Filter out jobs the user has already seen
    const docs = rawDocs.filter((doc) => {
      if (!doc?.id) return false;
      return !this.bloomFilterService.mightContain(bloomKey, doc.id);
    });

    // Add newly recommended jobs to bloom filter
    for (const doc of docs) {
      if (doc?.id) {
        this.bloomFilterService.add(bloomKey, doc.id);
      }
    }
    // Khắc phục Race Condition: Lưu liền tay xuống Redis nhưng không dùng await để tránh block API
    this.bloomFilterService.syncKeyToRedis(bloomKey).catch(() => {});

    // Extract job IDs for batch query
    const jobIds: string[] = [];
    const orgIds: string[] = [];

    for (const doc of docs) {
      if (!doc?.id) continue;
      jobIds.push(doc.id);
      const orgId = doc.organizationId;
      if (typeof orgId === "string" && orgId.length > 0) orgIds.push(orgId);
    }

    const uniqueOrgIds = [...new Set<string>(orgIds)];

    const [userJobStatusMap, organizations] = await Promise.all([
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
    ]);
    const organizationMap = keyBy(organizations, "id");

    // Transform ES results to JobMatchResult (extends JobResponse)
    const jobs = this.convertHitToDto(docs, organizationMap, userJobStatusMap);

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
  ): JobMatchResultDto[] {
    return actualHits.map((source: any) => {
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
        recruitCount:
          typeof source.recruitCount === "number"
            ? source.recruitCount
            : source.recruitCount != null
              ? Number(source.recruitCount)
              : null,
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
        applyUrl: source.applyUrl ?? null,
        embedding: null,
      };

      const jobStatus = userJobStatusMap.get(job.id) || {
        isSaved: false,
        isApplied: false,
        applyStatus: null,
        applyId: null,
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
        applyUrl: source.applyUrl ?? null,
        score: typeof source.score === "number" ? source.score : 0,
      } as JobMatchResultDto;
    });
  }

  async getMatchedJobsWithScoresLegacy(
    userId: string,
    filters: JobFilters,
  ): Promise<ApiResponse<PaginatedResult<JobMatchResultDto>>> {
    const userProfile = await this.userRepository.getUserProfile(userId);
    if (!userProfile) {
      throw new NotFoundException({
        message: `User ${userId} not found`,
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
    }

    const {
      data: docs,
      pagination: { nextCursor, hasNextPage: hasMore },
    } = await this.jobSearchService.matchJobsLegacy(userProfile, filters);

    // Extract job IDs for batch query
    const jobIds: string[] = [];
    const orgIds: string[] = [];

    for (const doc of docs) {
      if (!doc?.id) continue;
      jobIds.push(doc.id);
      const orgId = doc.organizationId;
      if (typeof orgId === "string" && orgId.length > 0) orgIds.push(orgId);
    }

    const uniqueOrgIds = [...new Set<string>(orgIds)];

    const [userJobStatusMap, organizations] = await Promise.all([
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
    ]);
    const organizationMap = keyBy(organizations, "id");

    // Transform ES results to JobMatchResult (extends JobResponse)
    const jobs = this.convertHitToDto(docs, organizationMap, userJobStatusMap);

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
}
