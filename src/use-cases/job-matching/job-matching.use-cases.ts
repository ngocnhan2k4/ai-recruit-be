import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  IEmailQueueStorageService,
  IJobRepository,
  IUserRepository,
  IUserSkillRepository,
  IUserExperienceRepository,
  ISearchService,
  IUserOnboardingRepository,
} from "@/core";
import {
  EmailJobType,
  Job,
  Province,
  Skill,
  Category,
  OrganizationRoleEnum,
  UserProfile,
  OrganizationTypeEnum,
} from "@/core/entities";
import { JobFilters } from "@/core/entities/job.entity";
import { randomUUID } from "crypto";
import { subDays } from "date-fns/subDays";
import { EmailJob } from "@/core/entities/email.entity";
import { JobMatchingQuery } from "@/frameworks/data-services/elasticsearch/queries/job-matching.query";
import { differenceInYears } from "date-fns";
import { RESPONSE_CODE } from "@/common/constants";
import { PaginatedResult } from "@/common/types";
import {
  ApiResponse,
  JobMatchResultDto,
  OrganizationWithDetailsDto,
} from "@/interfaces/dtos";

@Injectable()
export class JobMatchingUseCases {
  private readonly logger = new Logger(JobMatchingUseCases.name);

  constructor(
    private readonly jobRepository: IJobRepository,
    private readonly emailStorageService: IEmailQueueStorageService,
    private readonly userRepository: IUserRepository,
    private readonly userSkillRepository: IUserSkillRepository,
    private readonly userOnboardingRepository: IUserOnboardingRepository,
    private readonly userExperienceRepository: IUserExperienceRepository,
    private readonly searchService: ISearchService,
    private readonly jobMatchingQuery: JobMatchingQuery,
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
            subDays(new Date(), 1),
            new Date(),
            true,
            20,
          );

          if (recommendedJobs.length === 0) {
            this.logger.debug(
              `No recommended jobs found for user ${user.userId}`,
            );
            continue;
          }

          const emailJob: EmailJob = {
            id: randomUUID(),
            type: EmailJobType.JOB_RECOMMENDATIONS,
            data: {
              to: user.email,
              userName: user.name,
              jobs: recommendedJobs.slice(0, 10),
            },
            attempts: 0,
            maxAttempts: 3,
            createdAt: new Date(),
          };

          this.emailStorageService.addToQueue(emailJob);
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

    const user = await this.userRepository.get(userId);
    if (!user) {
      throw new NotFoundException({
        message: `User ${userId} not found`,
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
    }

    // Get user skills
    const [userSkills, userExperiences, userOnboarding] = await Promise.all([
      this.userSkillRepository.getUserSkills(user.username),
      this.userExperienceRepository.getUserExperiencesByUsername(user.username),
      this.userOnboardingRepository.getByField({ userId }),
    ]);
    const skillIds = userSkills.map((skill) => skill.id);

    let experienceYears = 0;
    if (userExperiences.length > 0) {
      // Calculate total years of experience
      const totalMonths = userExperiences.reduce((sum, exp) => {
        const startDate = new Date(exp.experience.startDate);
        const endDate = exp.experience.endDate
          ? new Date(exp.experience.endDate)
          : new Date();
        const months = differenceInYears(endDate, startDate);
        return sum + months;
      }, 0);
      experienceYears = Math.max(0, totalMonths);
    }

    const userProfile: UserProfile = {
      userId: user.id,
      skillIds,
      experienceYears,
      provinceIds: userOnboarding[0]?.provinceIds || [],
      categoryIds: userOnboarding[0]?.categoryIds || [],
      expectedSalary: userOnboarding[0]?.expectedSalary
        ? Number(userOnboarding[0].expectedSalary)
        : undefined,
    };

    console.log("userProfile", userProfile);

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
    const jobIds: string[] = actualHits
      .map((hit: any) => hit._source?.id as string | undefined)
      .filter(
        (id: string | undefined): id is string =>
          typeof id === "string" && id.length > 0,
      );

    const userJobStatusMap =
      jobIds.length > 0
        ? await this.jobRepository.getUserJobStatuses(userId, jobIds)
        : new Map<
            string,
            {
              isSaved: boolean;
              isApplied: boolean;
              applyStatus: string | null;
              applyId: string | null;
            }
          >();

    // Transform ES results to JobMatchResult (extends JobResponse)
    const jobs: JobMatchResultDto[] = actualHits.map((hit: any) => {
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
      const organization: OrganizationWithDetailsDto = {
        id: source.organizationId,
        name: source.organizationName || "",
        slug: "",
        type: OrganizationTypeEnum.COMPANY,
        description: null,
        address: null,
        logoUrl: null,
        about: null,
        websiteUrl: null,
        email: null,
        phone: null,
        foundedYear: null,
        verifiedAt: null,
        employeesMin: null,
        employeesMax: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        companySize: null,
        taxCode: null,
        benefits: null,
        companyRawId: null,
        schoolType: null,
        culture: null,
        locations: [],
        role: OrganizationRoleEnum.ANONYMOUSLY,
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
        questions: [],
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
        organization,
        skills,
        category,
        isSaved: jobStatus.isSaved,
        isApplied: jobStatus.isApplied,
        applyStatus: jobStatus.applyStatus || undefined,
        applyId: jobStatus.applyId || undefined,
        score: hit._score,
      } as JobMatchResultDto;
    });

    // Generate next cursor if there are more results
    let nextCursor: string | undefined;
    if (hasMore) {
      const lastHit = actualHits[actualHits.length - 1];
      const searchAfter = lastHit.sort;
      nextCursor = Buffer.from(JSON.stringify(searchAfter)).toString("base64");
    }

    const total = response.hits.total?.value || 0;

    this.logger.log(
      `Found ${jobs.length} matched jobs for user ${userId}, hasMore: ${hasMore}`,
    );

    return {
      data: {
        data: jobs,
        pagination: {
          total,
          nextCursor,
          hasNextPage: hasMore,
        },
      },
      message: "Successfully retrieved matched jobs",
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
