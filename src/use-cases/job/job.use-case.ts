import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { IJobRepository, IOrganizationRepository } from "@/core/abstracts";
import { ApiResponse, CompanyDto, JobCountsDto } from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { omit } from "lodash";
import {
  StatisticsJobFilterRequestDto,
  StatisticsJobResponse,
  ApplyJobResponseDto,
  UserInteractionResponseDto,
  CreateJobDto,
  UpdateJobDto,
  ApplyJobDto,
  UpdateApplyJobDto,
} from "@/interfaces/dtos";
import {
  Skill,
  Job,
  Province,
  JobStatusEnum,
  WorkTypeEnum,
  OrganizationWithDetails,
  UpdateJobTypeEnum,
  Notification,
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
  JobFilters,
  JobResponse,
  StatisticsJobFilter,
} from "@/core/entities/job.entity";
import { convertDateToStr } from "@/common/utils/date";
import { GeneralQueryDto } from "@/interfaces/dtos/common/query";
import { PaginatedResultDto } from "@/interfaces/dtos/common/query";
import { PaginatedResult } from "@/common/types/api";
import { RoleEnum } from "@/common/constants/roles";
import { IWebSocketGateway } from "@/core/abstracts/websocket.abstract";
import { TokenPayload } from "@/common/types/token";

@Injectable()
export class JobUseCases {
  private readonly logger = new Logger(JobUseCases.name);
  constructor(
    private readonly jobRepository: IJobRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly webSocketGateway: IWebSocketGateway,
  ) {}

  async getJobs(
    filters: JobFilters,
  ): Promise<ApiResponse<PaginatedResult<JobResponseDto>>> {
    let result: PaginatedResult<JobResponse>;
    // Decide which method to call based on user role
    if (filters.user?.roles.includes(RoleEnum.ADMIN)) {
      this.logger.log("Fetching jobs for admin user");
      result = await this.jobRepository.getJobsByAdmin(filters);
    } else {
      this.logger.log("Fetching jobs for regular user");
      result = await this.jobRepository.getJobs(filters);
    }

    this.logger.log(`Fetched ${result.data.length} jobs`);
    // Transform Job entities to JobDtos
    const transformedJobData = result.data.map((item) => ({
      ...item,
      job: {
        ...item.job,
        questions: item.job.questions,
        organizationId: item.organization.id,
      } as JobDto,
      company: {
        ...item.organization,
        organizationId: item.organization.id,
        companySize: item.organization.companySize || 0,
        taxCode: item.organization.taxCode || "",
        benefits: item.organization.benefits || "",
        companyRawId: item.organization.companyRawId || 0,
        verifiedAt: item.organization.verifiedAt?.toISOString() || null,
      } as CompanyDto,
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

  async getStatisticsJobs(
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

    this.logger.log(`Fetched statistics jobs`);
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

  async applyJob(
    userId: string,
    applyJobDto: ApplyJobDto,
  ): Promise<ApiResponse<ApplyJobResponseDto>> {
    // Ensure job exists
    const job = await this.jobRepository.getJobById(applyJobDto.jobId);
    if (!job) {
      throw new BadRequestException({
        message: "Job not found",
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
        } = await this.jobRepository.applyJob(
      applyJobDto.jobId,
      applyJobDto.cvId!,
      isSendNotifications,
      userId,
      applyJobDto.answers,
    );

    let application: ApplyJobResponse;
    if ("application" in repoResult) {
      application = repoResult.application;
      const notifications = repoResult.notifications;
      const jobTitle = repoResult.jobTitle;

      // Send notifications to recipients
      notifications.forEach((notification) => {
        const sent = this.webSocketGateway.sendToUser(
          {
            userId: notification.receiverId,
            organizationId: notification.organizationId || undefined,
          },
          notification,
        );

        if (sent) {
          this.logger.log(
            `Sent new-application notification to ${notification.receiverId} for job "${jobTitle}"`,
          );
        } else {
          this.logger.warn(
            `Failed to send websocket notification to ${notification.receiverId}`,
          );
        }
      });
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

  async hideJob(
    userId: string,
    jobId: string,
    hide: boolean,
  ): Promise<ApiResponse<UserInteractionResponseDto | null>> {
    const result = await this.jobRepository.hideJob(userId, jobId, hide);
    this.logger.log(`User ${userId} ${hide ? "hid" : "unhid"} job ${jobId}`);
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    };
  }

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

    const repoResult = await this.jobRepository.createJob(
      jobData,
      true,
      userId,
    );

    let newJob: Job;
    if ("job" in repoResult) {
      newJob = repoResult.job;
      const notifications = repoResult.newNotifications;

      // Send notifications to recipients
      notifications.forEach((notification) => {
        const sent = this.webSocketGateway.sendToUser(
          {
            userId: notification.receiverId,
          },
          notification,
        );

        if (sent) {
          this.logger.log(
            `Sent job-created notification to ${notification.receiverId} for job "${newJob.title}"`,
          );
        } else {
          this.logger.warn(
            `Failed to send websocket notification to ${notification.receiverId}`,
          );
        }
      });
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
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: transformedJob,
    };
  }

  async updateJob(
    jobId: string,
    updateJobDto: UpdateJobDto & { userId: string },
  ): Promise<ApiResponse<JobDto>> {
    const existingJob = await this.jobRepository.getJobById(jobId);
    if (!existingJob) {
      throw new BadRequestException({
        message: "Job not found",
        code: RESPONSE_CODE.JOB_NOT_FOUND,
      });
    }

    const updateData: Partial<Job> = {
      ...updateJobDto,
      status: updateJobDto.status || undefined,
      questions: updateJobDto.questions || undefined,
      workType: updateJobDto.workType,
    };

    const updatedJob = await this.jobRepository.updateJob(jobId, updateData);
    if (!updatedJob) {
      throw new BadRequestException({
        message: "Failed to update job",
        code: RESPONSE_CODE.JOB_NOT_UPDATED,
      });
    }

    if (
      updateJobDto.updateType === UpdateJobTypeEnum.APPROVAL ||
      updateJobDto.updateType === UpdateJobTypeEnum.REJECTED
    ) {
      const { newNotifications } =
        await this.jobRepository.updateJobWithNotifications(
          jobId,
          updateData,
          updateJobDto.userId,
        );
      newNotifications.forEach((notification) => {
        this.webSocketGateway.sendToUser(
          {
            userId: notification.receiverId,
            organizationId: notification.organizationId || undefined,
          },
          notification,
        );
      });
    }
    // Transform questions field
    const transformedJob: JobDto = {
      ...updatedJob,
      questions: updatedJob.questions || null,
      status: updatedJob.status as JobStatusEnum,
      workType: updatedJob.workType as WorkTypeEnum,
    };

    this.logger.log(`Updated job ${jobId}: ${updatedJob.title}`);
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
    const existingJob = await this.jobRepository.getJobById(jobId);
    if (!existingJob) {
      throw new BadRequestException({
        message: "Job not found",
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

    const deleted = await this.jobRepository.deleteJob(jobId);
    if (!deleted) {
      throw new BadRequestException({
        message: "Job deleted failed",
        code: RESPONSE_CODE.JOB_NOT_DELETED,
      });
    }

    this.logger.log(`Deleted job ${jobId}`);
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
    } | null = await this.jobRepository.getFullJobById(jobId, userId);
    if (!job) {
      this.logger.error(
        `[getJobById] [getFullJobById] Job not found: ${jobId}`,
      );
      throw new NotFoundException({
        message: "Job not found",
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
      company: {
        id: job.organization.id,
        name: job.organization.name,
        slug: job.organization.slug,
        type: job.organization.type,
        description: job.organization.description,
        address: job.organization.address,
        logoUrl: job.organization.logoUrl,
      } as CompanyDto,
    };

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: transformedJob,
    };
  }
  async getApplyJobs(
    jobId: string,
  ): Promise<ApiResponse<ApplyJobResponseDto[]>> {
    const result = await this.jobRepository.getApplyJobs(jobId);
    this.logger.log(`Get job applications for job ${jobId}`);

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
}
