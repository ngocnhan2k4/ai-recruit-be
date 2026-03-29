import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  IJobRepository,
  IOrganizationRepository,
  ISearchService,
  ISkillsSynonymsRepository,
} from "@/core/abstracts";
import {
  ApiResponse,
  JobCountsDto,
  OrganizationWithDetailsDto,
  StatisticsJobResponse,
  TopInMarketDtoResponse,
  CompareStatisticsResponseDto,
  CompareTopInMarketResponseDto,
  JobTrendsResponseDto,
  JobTrendsQueryDto,
  JobMatchResultDto,
} from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { Dictionary, keyBy, omit } from "lodash";
import {
  StatisticsJobFilterRequestDto,
  CompareStatisticsFilterRequestDto,
  ApplyJobResponseDto,
  UserInteractionResponseDto,
  CreateJobDto,
  UpdateJobDto,
  ApplyJobDto,
  UpdateApplyJobDto,
  ApplyJobQueryDto,
} from "@/interfaces/dtos";
import {
  Skill,
  Job,
  Province,
  JobStatusEnum,
  WorkTypeEnum,
  OrganizationWithDetails,
  Notification,
  Category,
  JobResponse,
} from "@/core";
import { BadRequestException } from "@nestjs/common";
import {
  JobDto,
  SavedJobsResponseDto,
  AppliedJobsResponseDto,
  JobResponseDto,
} from "@/interfaces/dtos";
import {
  ApplyJobResponse,
  JobEventType,
  JobFilters,
  StatisticsJobFilter,
} from "@/core";
import { convertDateToStr } from "@/common/utils";
import { GeneralQueryDto } from "@/interfaces/dtos/common/query";
import { PaginatedResultDto } from "@/interfaces/dtos/common/query";
import { PaginatedResult, TokenPayload } from "@/common/types";
import { RoleEnum } from "@/common/constants";
import { IWebSocketGateway } from "@/core/abstracts/websocket.abstract";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import { ROOM_NOTIFICATIONS } from "@/common/constants";
import { JobMatchingQuery } from "@/frameworks/data-services/elasticsearch/queries/job-matching.query";

@Injectable()
export class JobUseCases {
  private readonly logger = new Logger(JobUseCases.name);
  constructor(
    private readonly jobRepository: IJobRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly webSocketGateway: IWebSocketGateway,
    private readonly messageQueueService: IMessageQueueService,
    private readonly searchService: ISearchService,
    private readonly jobMatchingQuery: JobMatchingQuery,
    private readonly skillsSynonymRepo: ISkillsSynonymsRepository,
  ) {}

  async getJobs(
    filters: JobFilters,
    isOrg?: boolean,
  ): Promise<ApiResponse<PaginatedResult<JobResponseDto>>> {
    if (filters.cursor) {
      // return empty array if user not logged in
      if (!filters?.user?.userId)
        return {
          message: RESPONSE_MESSAGE.SUCCESS,
          code: RESPONSE_CODE.SUCCESS,
          data: {
            data: [],
            pagination: { nextCursor: undefined, hasNextPage: false },
          },
        };
    }

    // If it's role user, only get status active, close and paused
    if (!isOrg) {
      filters.statuses = [
        JobStatusEnum.ACTIVE,
        JobStatusEnum.CLOSED,
        JobStatusEnum.PAUSED,
      ];
    }

    const esQuery = this.jobMatchingQuery.buildSearchQuery(filters);

    // Execute query
    const response = await this.searchService.search(
      esQuery.index as string,
      esQuery.body,
    );

    // Check if we got more results than requested (to determine hasMore)
    const hits = response.hits.hits;
    const hasMore = hits.length > filters.limit;
    const actualHits = hasMore ? hits.slice(0, filters.limit) : hits;

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
        ? this.jobRepository.getUserJobStatuses(filters.user?.userId, jobIds)
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

    // Generate next cursor if there are more results
    let nextCursor: string | undefined;
    if (hasMore) {
      const lastHit = actualHits[actualHits.length - 1];
      const searchAfter = lastHit.sort;
      nextCursor = Buffer.from(JSON.stringify(searchAfter)).toString("base64");
    }

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        data: this.convertHitToDto(
          actualHits,
          organizationMap,
          userJobStatusMap,
          jobMap,
        ),
        pagination: {
          nextCursor,
          hasNextPage: hasMore,
        },
      },
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
      } as JobResponseDto;
    });
  }

  async getJobsByAdmin(
    filters: JobFilters,
  ): Promise<ApiResponse<PaginatedResult<JobResponseDto>>> {
    // Decide which method to call based on user role
    const result = await this.jobRepository.getJobsByAdmin(filters);

    this.logger.log(`Fetched ${result.data.length} jobs`);
    // Transform Job entities to JobDtos
    const transformedJobData = result.data.map((item) => ({
      ...item,
      job: {
        ...item.job,
      } as JobDto,
      organization: {
        ...item.organization,
      } as OrganizationWithDetailsDto,
      skills: item.skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
      })),
    }));

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        data: transformedJobData,
        pagination: result.pagination,
      },
    };
  }

  async getJobStatistics(
    filter: StatisticsJobFilterRequestDto,
  ): Promise<ApiResponse<StatisticsJobResponse>> {
    const [
      frequentlyJobs,
      openJobCount,
      salaryStatistics,
      totalJobs,
      totalJobByCategoryId,
    ] = await Promise.all([
      this.jobRepository.getFrequentlyJobs(filter),
      this.jobRepository.count({
        ...filter,
        isOpen: true,
      }),
      this.jobRepository.getSalaryStatisticsByExperience(filter),
      this.jobRepository.count({
        ...(omit(filter, ["categoryId"]) as StatisticsJobFilter),
      }),
      this.jobRepository.count({
        ...filter,
      }),
    ]);

    this.logger.log(`Fetched job statistics`);
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        frequentlyJobs,
        openJobCount,
        salaryStatistics,
        totalJobs,
        totalJobByCategoryId,
      },
    };
  }

  async getTopInMarket(
    filter: StatisticsJobFilterRequestDto,
  ): Promise<ApiResponse<TopInMarketDtoResponse>> {
    const [topAppliedJobs, topEmployers, topCategories] = await Promise.all([
      this.jobRepository.getTopAppliedJobs(filter),
      this.jobRepository.getTopEmployers(filter, 5),
      this.jobRepository.getTopCategories(filter),
    ]);

    this.logger.log(`Fetched top in market data`);
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        topAppliedJobs,
        topEmployers,
        topCategories,
      },
    };
  }

  /**
   * Rank categories by job count, return top `limit` IDs.
   */
  private resolveTopIds<T extends { categoryId: string }>(
    ranked: T[],
    limit: number,
    key: keyof T,
  ): T[] {
    return [...ranked]
      .sort((a, b) => (Number(b[key]) || 0) - (Number(a[key]) || 0))
      .slice(0, limit);
  }

  async getCompareStatistics(
    filter: CompareStatisticsFilterRequestDto,
  ): Promise<ApiResponse<CompareStatisticsResponseDto>> {
    const { categoryIds, fromDate, toDate, provinceId, limit } = filter;

    const effectiveLimit = limit ?? categoryIds.length;
    const baseFilter = { fromDate, toDate, provinceId };

    // 1) Ranking + data in batch queries (6 queries total, all parallel)
    const [
      allCounts,
      openCounts,
      allSalaries,
      trendData,
      salaryData,
      totalJobs,
    ] = await Promise.all([
      this.jobRepository.countByCategories(categoryIds, baseFilter),
      this.jobRepository.countByCategories(categoryIds, {
        ...baseFilter,
        isOpen: true,
      }),
      this.jobRepository.avgSalaryByCategories(categoryIds, baseFilter),
      this.jobRepository.getFrequentlyJobsByCategories(categoryIds, baseFilter),
      this.jobRepository.getSalaryStatsByCategories(categoryIds, baseFilter),
      this.jobRepository.count(baseFilter as StatisticsJobFilter),
    ]);

    // 2) Independently pick top N per metric from the batch results
    const topByTotalJobs = this.resolveTopIds(
      allCounts,
      effectiveLimit,
      "count",
    ).map((c) => ({
      categoryId: c.categoryId,
      totalJobByCategoryId: c.count,
    }));

    const topByOpenJobs = this.resolveTopIds(
      openCounts,
      effectiveLimit,
      "count",
    ).map((c) => ({
      categoryId: c.categoryId,
      openJobCount: c.count,
    }));

    const trendCountMap = new Map(
      allCounts.map((c) => [c.categoryId, c.count]),
    );
    const trendWithCount = trendData.map((t) => ({
      ...t,
      count: trendCountMap.get(t.categoryId) ?? 0,
    }));
    const topByTrend = this.resolveTopIds(
      trendWithCount,
      effectiveLimit,
      "count",
    ).map(({ categoryId, frequentlyJobs }) => ({
      categoryId,
      frequentlyJobs,
    }));

    const topBySalary = this.resolveTopIds(
      allSalaries,
      effectiveLimit,
      "avgSalary",
    ).map((s) => {
      const detail = salaryData.find((d) => d.categoryId === s.categoryId);
      return {
        categoryId: s.categoryId,
        salaryStatistics: detail?.salaryStatistics ?? [],
      };
    });

    this.logger.log(
      `Fetched compare statistics: totalJobs=${topByTotalJobs.length}, openJobs=${topByOpenJobs.length}, trend=${topByTrend.length}, salary=${topBySalary.length} / ${categoryIds.length} categories`,
    );
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        totalJobs,
        topByTotalJobs,
        topByOpenJobs,
        topByTrend,
        topBySalary,
      },
    };
  }

  async getCompareTopInMarket(
    filter: CompareStatisticsFilterRequestDto,
  ): Promise<ApiResponse<CompareTopInMarketResponseDto>> {
    const { categoryIds, fromDate, toDate, provinceId, limit } = filter;

    const effectiveLimit = limit ?? categoryIds.length;
    const baseFilter = { fromDate, toDate, provinceId };

    // Fetch ALL categories for each metric independently (2 batch queries)
    const [appliedData, employerData] = await Promise.all([
      this.jobRepository.getTopAppliedJobsByCategories(categoryIds, baseFilter),
      this.jobRepository.getTopEmployersByCategories(
        categoryIds,
        baseFilter,
        5,
      ),
    ]);

    // Rank independently: top by total application count
    const appliedWithTotal = appliedData.map((d) => ({
      ...d,
      totalCount: d.topAppliedJobs.reduce((sum, j) => sum + (j.count ?? 0), 0),
    }));
    const topByApplied = this.resolveTopIds(
      appliedWithTotal,
      effectiveLimit,
      "totalCount",
    ).map(({ categoryId, topAppliedJobs }) => ({
      categoryId,
      topAppliedJobs,
    }));

    // Rank independently: top by total employer job count
    const employerWithTotal = employerData.map((d) => ({
      ...d,
      totalCount: d.topEmployers.reduce((sum, e) => sum + (e.count ?? 0), 0),
    }));
    const topByEmployer = this.resolveTopIds(
      employerWithTotal,
      effectiveLimit,
      "totalCount",
    ).map(({ categoryId, topEmployers }) => ({
      categoryId,
      topEmployers,
    }));

    this.logger.log(
      `Fetched compare top-in-market: applied=${topByApplied.length}, employer=${topByEmployer.length} / ${categoryIds.length} categories`,
    );
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: { topByApplied, topByEmployer },
    };
  }

  async applyJob(
    userId: string,
    applyJobDto: ApplyJobDto,
  ): Promise<ApiResponse<ApplyJobResponseDto>> {
    // Ensure job exists
    const job = await this.jobRepository.get(applyJobDto.jobId);
    if (!job || job.deletedAt) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.JOB_NOT_FOUND,
        code: RESPONSE_CODE.JOB_NOT_FOUND,
      });
    }

    const isSendNotifications = true;

    const repoResult:
      | ApplyJobResponse
      | {
          application: ApplyJobResponse;
          notifications: Notification[];
          jobTitle?: string;
        } = await this.jobRepository.applyJob({
      jobId: applyJobDto.jobId,
      userCvId: applyJobDto.cvId!,
      sendNotifications: isSendNotifications,
      senderUserId: userId,
      answers: applyJobDto.answers,
    });

    let application: ApplyJobResponse;
    if ("application" in repoResult) {
      application = repoResult.application;
      const notifications = repoResult.notifications;
      const jobTitle = repoResult.jobTitle;

      // Send notifications to room org
      this.webSocketGateway.sendToRoom(
        ROOM_NOTIFICATIONS.org({ orgId: job.organizationId }),
        notifications[0],
      );
      this.logger.log(
        `Sent new-application notification to room ${ROOM_NOTIFICATIONS.org({ orgId: job.organizationId })} for job "${jobTitle}"`,
      );
    } else {
      application = repoResult;
    }

    this.logger.log(`User ${userId} applied for job ${applyJobDto.jobId}`);

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: application,
    };
  }

  async updateApplyJob(
    orgSenderId: string,
    applyId: string,
    updateApplyJobDto: UpdateApplyJobDto,
  ): Promise<ApiResponse<ApplyJobResponseDto>> {
    const isSendNotifications = true;

    const repoResult:
      | ApplyJobResponse
      | {
          application: ApplyJobResponse;
          notification: Notification;
          jobTitle: string;
        } = await this.jobRepository.updateApplyJob(
      applyId,
      updateApplyJobDto.status!,
      isSendNotifications,
      orgSenderId,
      updateApplyJobDto.userCvId,
      updateApplyJobDto.answers,
    );

    if (!repoResult) {
      throw new BadRequestException({
        message: "Failed to update application",
        code: RESPONSE_CODE.APPLICATION_NOT_UPDATED,
      });
    }

    let application: ApplyJobResponse;
    if ("application" in repoResult) {
      application = repoResult.application;
      const notification = repoResult.notification;
      const jobTitle = repoResult.jobTitle;

      // Send notification
      if (notification) {
        const sent = this.webSocketGateway.sendToUser(
          {
            userId: notification.receiverId,
            organizationId: notification.organizationId || undefined,
          },
          notification,
        );

        if (sent) {
          this.logger.log(
            `Sent application status update notification to user ${notification.receiverId} for job "${jobTitle}"`,
          );
        } else {
          this.logger.warn(
            `Failed to send WebSocket notification to user ${notification.receiverId}`,
          );
        }
      }
    } else {
      application = repoResult;
    }

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: application,
    };
  }

  async getApplyJobById(
    applyId: string,
  ): Promise<ApiResponse<ApplyJobResponseDto>> {
    const result = await this.jobRepository.getApplyJobById(applyId);

    if (!result) {
      throw new BadRequestException({
        message: "Application not found",
        code: RESPONSE_CODE.JOB_NOT_FOUND,
      });
    }

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    };
  }

  async saveJob(
    userId: string,
    jobId: string,
    save: boolean,
  ): Promise<ApiResponse<UserInteractionResponseDto | null>> {
    const result = await this.jobRepository.saveJob(userId, jobId, save);
    this.logger.log(
      `User ${userId} ${save ? "saved" : "unsaved"} job ${jobId}`,
    );
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    };
  }

  async getJobCounts(): Promise<ApiResponse<JobCountsDto>> {
    const counts = await this.jobRepository.getJobCounts();
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: counts,
    };
  }
  // [TODO] remove later
  // async hideJob(
  //   userId: string,
  //   jobId: string,
  //   hide: boolean,
  // ): Promise<ApiResponse<UserInteractionResponseDto | null>> {
  //   const result = await this.jobRepository.hideJob(userId, jobId, hide);
  //   this.logger.log(`User ${userId} ${hide ? "hid" : "unhid"} job ${jobId}`);
  //   return {
  //     message: RESPONSE_MESSAGE.SUCCESS,
  //     code: RESPONSE_CODE.SUCCESS,
  //     data: result,
  //   };
  // }

  async createJob(
    userId: string,
    createJobDto: CreateJobDto,
  ): Promise<ApiResponse<JobDto>> {
    const jobData: Partial<Job> = {
      ...createJobDto,
      questions: createJobDto.questions || undefined,
      datePosted: convertDateToStr(new Date()),
      endDate: createJobDto.endDate
        ? convertDateToStr(new Date(createJobDto.endDate))
        : null,
    };

    if (
      typeof createJobDto.experienceMin !== "undefined" &&
      typeof createJobDto.experienceMax !== "undefined" &&
      createJobDto.experienceMin !== null &&
      createJobDto.experienceMax !== null &&
      createJobDto.experienceMin >= createJobDto.experienceMax
    ) {
      throw new BadRequestException({
        message: "experienceMin must be less than experienceMax",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    const repoResult = await this.jobRepository.createJob(
      jobData,
      true,
      userId,
    );

    let newJob: Job;
    if ("job" in repoResult) {
      newJob = repoResult.job;
      const notifications = repoResult.newNotifications;

      // Broadcast notification to admin room instead of looping through each user
      if (notifications && notifications.length > 0) {
        const notification = notifications[0]; // Use first notification for broadcast
        this.webSocketGateway.sendToRoom("admin", notification);
        this.logger.log(
          `Broadcast job-created notification to admin room for job "${newJob.title}" (${notifications.length} notifications created in DB)`,
        );
      }
    } else {
      newJob = repoResult;
    }

    // Transform questions field
    const transformedJob: JobDto = {
      ...newJob,
      questions: newJob.questions || null,
      status: newJob.status as JobStatusEnum,
      workType: newJob.workType as WorkTypeEnum,
    };

    this.logger.log(`Created job ${newJob.id}: ${newJob.title}`);
    await this.messageQueueService.addJob(JobEventType.UPSERT_JOB, {
      jobId: newJob.id,
    });
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: transformedJob,
    };
  }

  private async processJobUpdate(
    jobId: string,
    updateJobDto: UpdateJobDto,
    executeUpdate: (
      updateData: Partial<Job>,
    ) => Promise<{ updatedJob: Job | null; notifications?: Notification[] }>,
    isAdminUpdate = false,
  ): Promise<{
    transformedJob: JobDto;
    updatedJob: Job;
    notifications?: Notification[];
  }> {
    const organizationAllowedStatuses = [
      JobStatusEnum.ACTIVE,
      JobStatusEnum.CLOSED,
      JobStatusEnum.PAUSED,
    ];

    const { status: targetStatus } = updateJobDto;
    const job = await this.jobRepository.get(jobId);
    if (!job || job.deletedAt) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.JOB_NOT_FOUND,
        code: RESPONSE_CODE.JOB_NOT_FOUND,
      });
    }

    // Validate experience range on update (min < max)
    if (
      typeof updateJobDto.experienceMin !== "undefined" &&
      typeof updateJobDto.experienceMax !== "undefined" &&
      updateJobDto.experienceMin !== null &&
      updateJobDto.experienceMax !== null &&
      updateJobDto.experienceMin >= updateJobDto.experienceMax
    ) {
      throw new BadRequestException({
        message: "experienceMin must be less than experienceMax",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    if (
      !isAdminUpdate &&
      organizationAllowedStatuses.includes(targetStatus) &&
      !organizationAllowedStatuses.includes(job.status as JobStatusEnum)
    ) {
      throw new ForbiddenException({
        message:
          "Organizations can only set status to active, closed, or paused",
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }
    const updateData: Partial<Job> = {
      ...updateJobDto,
      status: updateJobDto.status || undefined,
      questions: updateJobDto.questions || undefined,
      workType: updateJobDto.workType,
    };

    const { updatedJob, notifications } = await executeUpdate(updateData);
    if (!updatedJob) {
      throw new BadRequestException({
        message: "Failed to update job",
        code: RESPONSE_CODE.JOB_NOT_UPDATED,
      });
    }

    const transformedJob: JobDto = {
      ...updatedJob,
      questions: updatedJob.questions || null,
      status: updatedJob.status as JobStatusEnum,
      workType: updatedJob.workType as WorkTypeEnum,
    };

    this.logger.log(`Updated job ${jobId}: ${updatedJob.title}`);
    if (
      [...organizationAllowedStatuses, JobStatusEnum.REJECTED].includes(
        updatedJob.status as JobStatusEnum,
      )
    ) {
      await this.messageQueueService.addJob(JobEventType.UPSERT_JOB, {
        jobId: jobId,
      });
    }

    return { transformedJob, updatedJob, notifications };
  }

  async updateJob(
    jobId: string,
    updateJobDto: UpdateJobDto,
  ): Promise<ApiResponse<JobDto>> {
    const { transformedJob } = await this.processJobUpdate(
      jobId,
      updateJobDto,
      async (updateData) => {
        const updatedJob = await this.jobRepository.updateJob(
          jobId,
          updateData,
        );
        return { updatedJob };
      },
    );
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: transformedJob,
    };
  }

  async adminUpdateJob(
    jobId: string,
    updateJobDto: UpdateJobDto,
    user: TokenPayload,
  ): Promise<ApiResponse<JobDto>> {
    const { transformedJob, updatedJob, notifications } =
      await this.processJobUpdate(
        jobId,
        updateJobDto,
        async (updateData) => {
          const { job, newNotifications } =
            await this.jobRepository.updateJobWithNotifications(
              jobId,
              updateData,
              user.userId,
            );
          return { updatedJob: job, notifications: newNotifications };
        },
        true,
      );

    if (notifications && notifications.length > 0) {
      const orgRoom = ROOM_NOTIFICATIONS.org({
        orgId: updatedJob.organizationId,
      });
      this.webSocketGateway.sendToRoom(orgRoom, notifications[0]);
      this.logger.log(
        `Broadcast job-updated notification to org room ${orgRoom} for job "${updatedJob.title}" (${notifications.length} notifications created in DB)`,
      );
    }
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: transformedJob,
    };
  }

  async deleteJob(
    user: TokenPayload,
    jobId: string,
    organizationId?: string,
  ): Promise<ApiResponse<{ message: string }>> {
    const existingJob = await this.jobRepository.get(jobId);
    if (!existingJob || existingJob.deletedAt) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.JOB_NOT_FOUND,
        code: RESPONSE_CODE.JOB_NOT_FOUND,
      });
    }

    // If the user is not an ADMIN, check organization permissions.
    if (!user?.roles.includes(RoleEnum.ADMIN)) {
      if (organizationId) {
        const members =
          await this.organizationRepository.getMemberIdsOfOrganization(
            organizationId,
          );

        const isMember = members.some((member) => member.id === user.userId);

        const isJobOwner = existingJob.organizationId === organizationId;

        if (!isMember || !isJobOwner) {
          throw new ForbiddenException({
            message: "You do not have permission to delete this job.",
            code: RESPONSE_CODE.FORBIDDEN,
          });
        }
      } else {
        throw new BadRequestException({
          message: RESPONSE_MESSAGE.ORGANIZATION_ID_REQUIRED,
          code: RESPONSE_CODE.ORGANIZATION_ID_REQUIRED,
        });
      }
    }

    const deleted = await this.jobRepository.delete({ id: jobId });
    if (!deleted) {
      throw new BadRequestException({
        message: "Job deleted failed",
        code: RESPONSE_CODE.JOB_NOT_DELETED,
      });
    }

    this.logger.log(`Deleted job ${jobId}`);
    await this.messageQueueService.addJob(JobEventType.DELETE_JOB, {
      jobId: jobId,
    });
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: { message: RESPONSE_CODE.SUCCESS },
    };
  }

  async getJobById(
    jobId: string,
    userId?: string,
  ): Promise<ApiResponse<JobResponseDto>> {
    const job: {
      job: Job;
      provinces: Province[];
      organization: OrganizationWithDetails;
      skills: Skill[];
      isSaved?: boolean;
      isApplied?: boolean;
      applyStatus?: string;
      applyId?: string;
      applyUrl?: string | null;
    } | null = await this.jobRepository.getFullJobById(jobId, userId);
    if (!job) {
      this.logger.error(
        `[getJobById] [getFullJobById] Job not found: ${jobId}`,
      );
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.JOB_NOT_FOUND,
        code: RESPONSE_CODE.JOB_NOT_FOUND,
      });
    }

    // Transform questions field
    const transformedJob: JobResponseDto = {
      ...job,
      job: {
        ...job.job,
        questions: job.job.questions || null,
        status: job.job.status as JobStatusEnum,
        workType: job.job.workType as WorkTypeEnum,
      },
      organization: {
        id: job.organization.id,
        name: job.organization.name,
        slug: job.organization.slug,
        type: job.organization.type,
        description: job.organization.description,
        address: job.organization.address,
        logoUrl: job.organization.logoUrl,
      } as OrganizationWithDetailsDto,
    };

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: transformedJob,
    };
  }
  async getApplyJobs(
    query: ApplyJobQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<ApplyJobResponseDto>>> {
    const result = await this.jobRepository.getApplyJobs(query.jobId, {
      fields: query.totalOnly ? ["total"] : [],
    });
    this.logger.log(`Get job applications for job ${query.jobId}`);

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    };
  }

  async getAllSavedJobs(
    userId: string,
    query: GeneralQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<SavedJobsResponseDto>>> {
    const result = await this.jobRepository.getAllSavedJobs(userId, query);
    const transformedData: PaginatedResultDto<SavedJobsResponseDto> = {
      data: result.data.map((job) => ({
        ...job,
        logoUrl: job.logoUrl || "",
        workType: job.workType ?? "onsite",
        createdAt: job.createdAt.toISOString(),
        endedAt: job.endedAt!,
        isSaved: true,
      })),
      pagination: result.pagination,
    };
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: transformedData,
    };
  }
  async getNumberOfSavedJobs(userId: string): Promise<ApiResponse<number>> {
    const count = await this.jobRepository.getNumberOfSavedJobs(userId);
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: count,
    };
  }
  async getNumberOfAppliedJobs(userId: string): Promise<ApiResponse<number>> {
    const count = await this.jobRepository.getNumberOfAppliedJobs(userId);
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: count,
    };
  }
  async getAllAppliedJobs(
    userId: string,
    query: GeneralQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<AppliedJobsResponseDto>>> {
    const result = await this.jobRepository.getAllAppliedJobs(userId, query);
    const transformedData: PaginatedResultDto<AppliedJobsResponseDto> = {
      data: result.data.map((job) => ({
        ...job,
        logoUrl: job.logoUrl || "",
        workType: job.workType ?? "onsite",
        createdAt: job.createdAt.toISOString(),
        endedAt: job.endedAt!,
        isSaved: true,
      })),
      pagination: result.pagination,
    };
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: transformedData,
    };
  }

  async getJobTrends(
    query: JobTrendsQueryDto,
  ): Promise<ApiResponse<JobTrendsResponseDto>> {
    const trends = await this.jobRepository.getJobTrends({
      fromDate: query.fromDate,
      toDate: query.toDate,
      type: query.type,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        data: trends,
      },
    };
  }

  async getJobsV2(
    filters: JobFilters,
  ): Promise<ApiResponse<PaginatedResult<JobResponseDto>>> {
    const result = await this.jobRepository.getJobs(filters);

    this.logger.log(`Fetched ${result.data.length} jobs`);
    // Transform Job entities to JobDtos
    const transformedJobData = result.data.map((item) => ({
      ...item,
      job: {
        ...item.job,
        questions: item.job.questions,
        organizationId: item.organization.id,
      } as JobDto,
      organization: {
        ...item.organization,
      } as OrganizationWithDetailsDto,
    }));

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        data: transformedJobData,
        pagination: result.pagination,
      },
    };
  }
}
