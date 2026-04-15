import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  IJobRepository,
  IOrganizationRepository,
  IJobSearchService,
  ICvRepository,
  IUserRepository,
  INotificationRepository,
} from "@/core/abstracts";
import { IUserFeatureUsageRepository } from "@/core/abstracts/repositories/user-feature-usage-repository.abstract";
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
  NotificationType,
  FeatureCodeEnum,
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
  ApplyJobFilters,
  JobEventType,
  JobFilters,
  StatisticsJobFilter,
} from "@/core";
import { convertDateToStr, getJobStatus } from "@/common/utils";
import { GeneralQueryDto } from "@/interfaces/dtos/common/query";
import { PaginatedResultDto } from "@/interfaces/dtos/common/query";
import { PaginatedResult, TokenPayload } from "@/common/types";
import { RoleEnum } from "@/common/constants";
import { IWebSocketGateway } from "@/core/abstracts/websocket.abstract";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";
import { ROOM_NOTIFICATIONS } from "@/common/constants";

@Injectable()
export class JobUseCases {
  private readonly logger = new Logger(JobUseCases.name);
  constructor(
    private readonly jobRepository: IJobRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly userRepository: IUserRepository,
    private readonly webSocketGateway: IWebSocketGateway,
    private readonly messageQueueService: IMessageQueueService,
    private readonly jobSearchService: IJobSearchService,
    private readonly notificationRepository: INotificationRepository,
    private readonly cvRepository: ICvRepository,
    private readonly userFeatureUsageRepository: IUserFeatureUsageRepository,
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

    const {
      data: docs,
      pagination: { nextCursor, hasNextPage: hasMore },
    } = await this.jobSearchService.searchJobs(filters);

    const jobIds: string[] = [];
    const orgIds: string[] = [];

    for (const doc of docs) {
      if (!doc?.id) continue;
      jobIds.push(doc.id);
      const orgId = doc.organizationId;
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

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        data: this.convertHitToDto(
          docs,
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
    return actualHits.map((source: any) => {
      const applyUrl = jobMap[source.id]?.applyUrl ?? null;
      const questions = jobMap[source.id]?.job?.questions ?? source.questions;
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
      const job: Omit<Job, "applyUrl"> = {
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
        questions,
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
        applyUrl,
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

  private normalizeQuestionText(value: string): string {
    return value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[đĐ]/g, "d")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  private extractPhoneFromApplyAnswers(
    answers?: ApplyJobDto["answers"],
  ): string | null {
    if (!answers || answers.length === 0) return null;

    for (const item of answers) {
      const normalizedQuestion = this.normalizeQuestionText(
        item.question || "",
      );
      const isPhoneQuestion =
        normalizedQuestion.includes("so dien thoai") ||
        normalizedQuestion === "sdt" ||
        normalizedQuestion.includes("phone");

      if (!isPhoneQuestion) continue;

      const rawPhone = (item.answer || "").trim();
      if (!rawPhone) return null;

      const normalizedPhone = rawPhone.replace(/[^\d+]/g, "");
      return normalizedPhone.length >= 9 ? normalizedPhone : null;
    }

    return null;
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

    if ((job.status as JobStatusEnum) !== JobStatusEnum.ACTIVE) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.JOB_NOT_ACTIVE,
        code: RESPONSE_CODE.JOB_NOT_ACTIVE,
      });
    }

    if (applyJobDto.cvId) {
      const cv = await this.cvRepository.get(applyJobDto.cvId);
      if (cv && cv.mimeType !== "application/pdf") {
        throw new BadRequestException({
          message: RESPONSE_MESSAGE.INVALID_FILE_TYPE,
          code: RESPONSE_CODE.CV_FILE_INVALID,
        });
      }
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

    const phoneFromAnswers = this.extractPhoneFromApplyAnswers(
      applyJobDto.answers,
    );
    if (phoneFromAnswers) {
      const user = await this.userRepository.get(userId);
      const hasPhone = Boolean(user?.phone && user.phone.trim().length > 0);

      if (!hasPhone) {
        try {
          await this.userRepository.update(
            { id: userId },
            { phone: phoneFromAnswers },
          );
          this.logger.log(
            `Updated missing phone for user ${userId} from apply answers`,
          );
        } catch (error: any) {
          this.logger.warn(
            `Could not update phone for user ${userId}: ${error?.message || "unknown error"}`,
          );
        }
      }
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
      updateApplyJobDto.cvId,
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
    const featureUsage =
      await this.userFeatureUsageRepository.getConsumeFeatureUsage(
        userId,
        FeatureCodeEnum.SAVE_JOB,
      );

    const now = new Date();

    const result = await this.userFeatureUsageRepository.executeWithTransaction(
      async () => {
        if (save && featureUsage?.featureId) {
          const limit = featureUsage.limit;
          await this.userFeatureUsageRepository.createIfNotExists(
            userId,
            featureUsage.featureId,
            now,
          );
          const consumed =
            await this.userFeatureUsageRepository.tryConsumeWithinLimit(
              userId,
              featureUsage.featureId,
              1,
              limit,
              now,
            );
          if (!consumed) {
            throw new ForbiddenException({
              code: RESPONSE_CODE.MAX_SAVED_JOBS_LIMIT,
              message: `Bạn chỉ có thể lưu tối đa ${limit} việc làm.`,
            });
          }
        }

        const jobResult = await this.jobRepository.saveJob(userId, jobId, save);

        if (!save && featureUsage?.featureId) {
          await this.userFeatureUsageRepository.releaseUsage(
            userId,
            featureUsage.featureId,
            1,
            now,
          );
        }

        return jobResult;
      },
    );

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
      applyUrl: createJobDto.applyUrl,
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

  private async validateJobUpdate(
    jobId: string,
    updateJobDto: UpdateJobDto,
    isAdminUpdate = false,
  ): Promise<{ currentJob: JobResponse }> {
    const organizationAllowedStatuses = [
      JobStatusEnum.ACTIVE,
      JobStatusEnum.CLOSED,
      JobStatusEnum.PAUSED,
    ];

    const { status: targetStatus } = updateJobDto;
    const jobDetail = await this.jobRepository.getFullJobById(jobId);
    if (!jobDetail || jobDetail.job?.deletedAt) {
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
        code: RESPONSE_CODE.INVALID_REQUEST,
      });
    }

    if (
      !isAdminUpdate &&
      organizationAllowedStatuses.includes(targetStatus) &&
      !organizationAllowedStatuses.includes(
        jobDetail.job.status as JobStatusEnum,
      )
    ) {
      throw new ForbiddenException({
        message:
          "Organizations can only set status to active, closed, or paused",
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    return {
      currentJob: jobDetail,
    };
  }

  private async finalizeJobUpdate(
    jobId: string,
    updatedJob: Job | null,
  ): Promise<{ transformedJob: JobDto; updatedJob: Job }> {
    const organizationAllowedStatuses = [
      JobStatusEnum.ACTIVE,
      JobStatusEnum.CLOSED,
      JobStatusEnum.PAUSED,
    ];

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

    return { transformedJob, updatedJob };
  }

  private normalizeComparableValue(field: string, value: unknown): unknown {
    if (typeof value !== "string") {
      return value;
    }

    let normalized = value.replace(/\r\n/g, "\n").trim();

    if (field === "description") {
      // Ignore formatting-only differences in markdown/html line breaks.
      normalized = normalized
        .replace(/\n{3,}/g, "\n\n")
        .replace(/(## [^\n]+)\n+(<p>)/g, "$1\n$2");
    }

    return normalized;
  }

  private getSortableValue(item: unknown): string {
    if (typeof item === "string") {
      return item;
    }

    if (
      typeof item === "number" ||
      typeof item === "boolean" ||
      typeof item === "bigint"
    ) {
      return `${item}`;
    }

    return JSON.stringify(item);
  }

  private getChangedFields(
    currentJob: JobResponse,
    updateJobDto: UpdateJobDto,
  ): string[] {
    const currentComparableValues: Record<string, unknown> = {
      ...(currentJob.job as Record<string, unknown>),
      provinceIds: currentJob?.provinces?.map((province) => province.id) ?? [],
      skillIds: currentJob?.skills?.map((skill) => skill.id) ?? [],
      skillNames:
        currentJob?.skills
          ?.map((skill) => skill.name)
          .filter((name): name is string => Boolean(name)) ?? [],
    };

    type NonReapprovalField = keyof UpdateJobDto;
    const nonReapprovalFieldList: NonReapprovalField[] = [
      "status",
      "salaryMin",
      "salaryMax",
      "experienceMin",
      "experienceMax",
      "workType",
      "categoryId",
      "provinceIds",
    ];
    const unorderedArrayFieldList: NonReapprovalField[] = [
      "provinceIds",
      "skillIds",
      "skillNames",
    ];

    const nonReapprovalFields = new Set<string>(nonReapprovalFieldList);

    const unorderedArrayFields = new Set<string>(unorderedArrayFieldList);

    const normalizeArrayForCompare = (
      field: string,
      value: unknown,
    ): unknown[] => {
      const normalizedArray = (Array.isArray(value) ? value : [value])
        .map((item) => this.normalizeComparableValue(field, item))
        .filter((item) => typeof item !== "undefined" && item !== null);

      if (unorderedArrayFields.has(field)) {
        const uniqueValues = new Map<string, unknown>();

        for (const item of normalizedArray) {
          const sortable = this.getSortableValue(item);
          if (!uniqueValues.has(sortable)) {
            uniqueValues.set(sortable, item);
          }
        }

        return [...uniqueValues.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([, item]) => item);
      }

      return normalizedArray;
    };

    const changedFields = Object.entries(updateJobDto)
      .filter(([key, value]) => {
        if (
          typeof value === "undefined" ||
          value === null ||
          nonReapprovalFields.has(key)
        ) {
          return false;
        }

        const currentValue = currentComparableValues[key];

        if (Array.isArray(value) || Array.isArray(currentValue)) {
          return (
            JSON.stringify(normalizeArrayForCompare(key, value)) !==
            JSON.stringify(normalizeArrayForCompare(key, currentValue))
          );
        }

        const normalizedNewValue = this.normalizeComparableValue(key, value);
        const normalizedCurrentValue = this.normalizeComparableValue(
          key,
          currentValue,
        );
        return normalizedNewValue !== normalizedCurrentValue;
      })
      .map(([key]) => key);
    return changedFields;
  }

  async updateJob(
    jobId: string,
    updateJobDto: UpdateJobDto,
    senderUserId: string,
  ): Promise<ApiResponse<JobDto>> {
    // Step 1: validate update and get current job details
    const { currentJob } = await this.validateJobUpdate(jobId, updateJobDto);

    // Step 2: Determine if changes require pending approval
    const changedFields = this.getChangedFields(currentJob, updateJobDto);

    const shouldSetPendingApproval = changedFields.length > 0;

    if (shouldSetPendingApproval) {
      this.logger.log(
        `Fields triggering pending approval for job ${jobId}: ${changedFields.join(", ")}`,
      );
    }

    if (shouldSetPendingApproval) {
      updateJobDto.status = JobStatusEnum.PENDING_APPROVAL;
    }

    const shouldNotifyAdmins =
      (currentJob.job.status as JobStatusEnum) !==
        JobStatusEnum.PENDING_APPROVAL && shouldSetPendingApproval;

    // Step 3: get admin recipients if needed
    const recipients = shouldNotifyAdmins
      ? (
          await this.userRepository.getAllAdminUsers({
            page: 1,
            limit: 100,
            isActive: true,
            isDeleted: false,
          })
        ).data.map((m) => ({
          receiverId: m.id,
        }))
      : [];

    const sender = shouldNotifyAdmins
      ? await this.userRepository.get(senderUserId)
      : null;

    // Step 4: update job in DB, create notifications if needed
    const { job: updatedJob, newNotifications } =
      await this.jobRepository.executeWithTransaction(async () => {
        const updatedJob = await this.jobRepository.updateJob(jobId, {
          ...updateJobDto,
          questions: updateJobDto.questions || undefined,
          skillIds: updateJobDto.skillIds || undefined,
          skillNames: updateJobDto.skillNames || undefined,
          provinceIds: updateJobDto.provinceIds || undefined,
        });
        if (!updatedJob) {
          return { job: null, newNotifications: [] };
        }

        let newNotifications: Notification[] = [];
        if (shouldNotifyAdmins && recipients.length > 0) {
          newNotifications =
            await this.notificationRepository.createNotificationWithRecipients(
              {
                title: "Công việc được cập nhật",
                message: `Công việc "${updatedJob.title}" đã được cập nhật và cần phê duyệt lại.`,
                type: NotificationType.JOB_UPDATED,
                senderId: senderUserId,
                payload: {
                  jobId: updatedJob.id,
                  orgId: updatedJob.organizationId,
                  avatarUrl: sender?.avatarUrl ?? undefined,
                },
              },
              recipients,
            );
        }

        return { job: updatedJob, newNotifications };
      });

    if (newNotifications.length > 0) {
      this.webSocketGateway.sendToRoom(
        ROOM_NOTIFICATIONS.admin,
        newNotifications[0],
      );
      this.logger.log(
        `Broadcast job-updated notification to admin room for job "${updatedJob?.title}" (${newNotifications.length} notifications created in DB)`,
      );
    }

    // Step 5: Publish job update event to message queue for search index update and other async processing
    const { transformedJob } = await this.finalizeJobUpdate(jobId, updatedJob);

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
    // Step 1: validate update and get current job details
    const { currentJob } = await this.validateJobUpdate(
      jobId,
      updateJobDto,
      true,
    );

    // Step 2: Get org members to notify
    const orgUsers =
      await this.organizationRepository.getMemberIdsOfOrganization(
        currentJob.job.organizationId,
      );

    const recipients = orgUsers.map((ou) => ({
      receiverId: ou.id,
      organizationId: currentJob.job.organizationId,
    }));

    const sender = await this.userRepository.get(user.userId);

    // Step 3: update job in DB, create notifications for org members about status change
    const { job: updatedJob, notifications } =
      await this.jobRepository.executeWithTransaction(async () => {
        const updatedJob = await this.jobRepository.updateJob(jobId, {
          ...updateJobDto,
          questions: updateJobDto.questions || undefined,
          skillIds: updateJobDto.skillIds || undefined,
          skillNames: updateJobDto.skillNames || undefined,
          provinceIds: updateJobDto.provinceIds || undefined,
        });

        if (recipients.length > 0) {
          const notifications =
            await this.notificationRepository.createNotificationWithRecipients(
              {
                title: "Cập nhật trạng thái công việc",
                message: `Công việc "${updateJobDto.title}" đã ${getJobStatus(updateJobDto.status)} bởi quản trị viên.`,
                type:
                  updateJobDto.status === JobStatusEnum.ACTIVE
                    ? NotificationType.ADMIN_JOB_APPROVED
                    : NotificationType.ADMIN_JOB_REJECTED,
                senderId: user.userId,
                payload: {
                  jobId,
                  orgId: currentJob.job.organizationId,
                  avatarUrl: sender?.avatarUrl ?? undefined,
                },
              },
              recipients,
            );
          return { job: updatedJob, notifications };
        }
        return { job: updatedJob, notifications: [] };
      });

    const { transformedJob, updatedJob: finalizedJob } =
      await this.finalizeJobUpdate(jobId, updatedJob);

    if (notifications && notifications.length > 0) {
      const orgRoom = ROOM_NOTIFICATIONS.org({
        orgId: finalizedJob.organizationId,
      });
      this.webSocketGateway.sendToRoom(orgRoom, notifications[0]);
      this.logger.log(
        `Broadcast job-updated notification to org room ${orgRoom} for job "${finalizedJob.title}" (${notifications.length} notifications created in DB)`,
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
      applyStatus?: string | null;
      applyId?: string | null;
      applyUrl?: string | null;
      category?: Category;
    } | null = await this.jobRepository.getFullJobById(jobId, {
      userId,
      statuses: [
        JobStatusEnum.ACTIVE,
        JobStatusEnum.PAUSED,
        JobStatusEnum.CLOSED,
      ],
    });
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
      organization: job.organization as OrganizationWithDetailsDto,
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
    const filters: ApplyJobFilters = {
      jobId: query.jobId,
      limit: query.limit ?? 10,
      cursor: query.cursor,
    };

    const result = await this.jobRepository.getApplyJobs(filters);

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
