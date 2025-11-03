import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { IJobRepository, INotificationRepository } from "@/core/abstracts";
import {
  ApiResponse,
  CompanyDto,
  JobCountsDto,
  UpdateJobStatusRequestDto,
  UpdateJobStatusResponseDto,
} from "@/interfaces/dtos";
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
  OrganizationRoleEnum,
  NotificationTypeEnum,
} from "@/core";
import { BadRequestException } from "@nestjs/common";
import {
  JobDto,
  SavedJobsResponseDto,
  AppliedJobsResponseDto,
  JobResponseDto,
} from "@/interfaces/dtos";
import {
  JobFilters,
  JobResponse,
  StatisticsJobFilter,
} from "@/core/entities/job.entity";
import { convertDateToStr } from "@/common/utils/date";
import { GeneralQueryDto } from "@/interfaces/dtos/common/query";
import { PaginatedResultDto } from "@/interfaces/dtos/common/query";
import { PaginatedResult } from "@/common/types/api";
import { RoleEnum } from "@/common/constants/roles";
import { IOrganizationMembersRepository } from "@/core/abstracts/repositories/organization-members.abstract";

@Injectable()
export class JobUseCases {
  private readonly logger = new Logger(JobUseCases.name);
  constructor(
    private readonly jobRepository: IJobRepository,
    private readonly organizationMembersRepository: IOrganizationMembersRepository,
    private readonly notificationRepository: INotificationRepository,
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
    try {
      // Check if job exists
      const job = await this.jobRepository.getJobById(applyJobDto.jobId);
      if (!job) {
        throw new BadRequestException("Job not found");
      }

      const result = await this.jobRepository.applyJob(
        applyJobDto.jobId,
        applyJobDto.cvId,
        applyJobDto.answers,
      );

      this.logger.log(`User ${userId} applied for job ${applyJobDto.jobId}`);
      return {
        message: RESPONSE_MESSAGE.SUCCESS,
        code: RESPONSE_CODE.SUCCESS,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to apply for job:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(error.message || "Failed to apply for job");
    }
  }

  async updateApplyJob(
    userId: string,
    applyId: string,
    updateApplyJobDto: UpdateApplyJobDto,
  ): Promise<ApiResponse<ApplyJobResponseDto>> {
    try {
      const result = await this.jobRepository.updateApplyJob(
        applyId,
        updateApplyJobDto.status,
        updateApplyJobDto.userCvId,
        updateApplyJobDto.answers,
      );

      if (!result) {
        throw new BadRequestException("Failed to update application");
      }

      this.logger.log(`User ${userId} updated application ${applyId}`);
      return {
        message: RESPONSE_MESSAGE.SUCCESS,
        code: RESPONSE_CODE.SUCCESS,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to update application:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(
        error.message || "Failed to update application",
      );
    }
  }

  async getApplyJobById(
    applyId: string,
  ): Promise<ApiResponse<ApplyJobResponseDto>> {
    try {
      const result = await this.jobRepository.getApplyJobById(applyId);

      if (!result) {
        throw new BadRequestException("Application not found");
      }

      return {
        message: RESPONSE_MESSAGE.SUCCESS,
        code: RESPONSE_CODE.SUCCESS,
        data: result,
      };
    } catch (error) {
      this.logger.error(`Failed to get application:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to get application");
    }
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

  async createJob(createJobDto: CreateJobDto): Promise<ApiResponse<JobDto>> {
    try {
      const jobData: Partial<Job> = {
        ...createJobDto,
        questions: createJobDto.questions || undefined,
        datePosted: convertDateToStr(new Date()),
        endDate: createJobDto.endDate
          ? convertDateToStr(new Date(createJobDto.endDate))
          : null,
        workType: createJobDto.workType,
      };

      const newJob = await this.jobRepository.createJob(jobData);

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
    } catch (error) {
      this.logger.error(`Failed to create job:`, error);
      throw new BadRequestException("Failed to create job");
    }
  }

  async updateJob(
    jobId: string,
    updateJobDto: UpdateJobDto,
  ): Promise<ApiResponse<JobDto>> {
    try {
      // Check if job exists
      const existingJob = await this.jobRepository.getJobById(jobId);
      if (!existingJob) {
        throw new BadRequestException("Job not found");
      }

      const updateData: Partial<Job> = {
        ...updateJobDto,
        status: updateJobDto.status || undefined,
        questions: updateJobDto.questions || undefined,
        workType: updateJobDto.workType,
      };

      const updatedJob = await this.jobRepository.updateJob(jobId, updateData);
      if (!updatedJob) {
        throw new BadRequestException("Failed to update job");
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
    } catch (error) {
      this.logger.error(`Failed to update job ${jobId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to update job");
    }
  }

  async deleteJob(jobId: string): Promise<ApiResponse<{ message: string }>> {
    try {
      // Check if job exists
      const existingJob = await this.jobRepository.getJobById(jobId);
      if (!existingJob) {
        throw new BadRequestException("Job not found");
      }

      const deleted = await this.jobRepository.deleteJob(jobId);
      if (!deleted) {
        throw new BadRequestException("Failed to delete job");
      }

      this.logger.log(`Deleted job ${jobId}`);
      return {
        message: RESPONSE_MESSAGE.SUCCESS,
        code: RESPONSE_CODE.SUCCESS,
        data: { message: "Job deleted successfully" },
      };
    } catch (error) {
      this.logger.error(`Failed to delete job ${jobId}:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to delete job");
    }
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

  // This func update job status and send notifications to org members
  async updateJobStatus(
    jobId: string,
    userId: string,
    updateJobDto: UpdateJobStatusRequestDto,
  ): Promise<ApiResponse<UpdateJobStatusResponseDto>> {
    try {
      // Validate the updated job status
      if (
        updateJobDto.status !== JobStatusEnum.ACTIVE &&
        updateJobDto.status !== JobStatusEnum.REJECTED
      ) {
        throw new BadRequestException(
          "Updated job status not valid. Must be active or rejected",
        );
      }

      // Check if job exists
      const existingJob = await this.jobRepository.getJobById(jobId);
      if (!existingJob) {
        throw new BadRequestException("Job not found");
      }

      // Update job status
      const updateData: Partial<Job> = {
        status: updateJobDto.status,
        rejectReason: updateJobDto.rejectReason || undefined,
      };

      const updatedJob = await this.jobRepository.updateJob(jobId, updateData);
      if (!updatedJob) {
        throw new BadRequestException("Failed to update job");
      }

      const organizationId = updateJobDto.orgId;
      let notificationSent = false;
      let notificationCount = 0;

      const members =
        await this.organizationMembersRepository.getMembersByOrganizationId(
          organizationId,
          "",
          100,
          { role: OrganizationRoleEnum.ORGANIZATION_RECRUITER_ADMIN },
        );

      // Send notifications to all recruiter admins
      if (members.data.length > 0) {
        const notificationType =
          updateJobDto.status === JobStatusEnum.ACTIVE
            ? NotificationTypeEnum.JOB_APPROVED
            : NotificationTypeEnum.JOB_REJECTED;

        const notificationTitle =
          updateJobDto.status === JobStatusEnum.ACTIVE
            ? "Tin tuyển dụng đã được duyệt"
            : "Tin tuyển dụng bị từ chối";

        const notificationMessage =
          updateJobDto.status === JobStatusEnum.ACTIVE
            ? `Tin tuyển dụng "${existingJob.title}" đã được duyệt và đang hoạt động`
            : `Tin tuyển dụng "${existingJob.title}" đã bị từ chối${updateJobDto.rejectReason ? `. Lý do: ${updateJobDto.rejectReason}` : ""}`;

        // Prepare recipients array
        const recipients = members.data.map((member) => ({
          receiverId: member.userId,
          organizationId: organizationId,
        }));

        // Send notification
        try {
          await this.notificationRepository.createNotificationWithRecipients(
            {
              title: notificationTitle,
              message: notificationMessage,
              type: notificationType,
              senderId: userId,
              payload: {
                jobId: jobId,
                orgId: organizationId,
              },
            },
            recipients,
          );

          notificationSent = true;
          notificationCount = recipients.length;

          this.logger.log(
            `Sent ${recipients.length} notification(s) to recruiter admins`,
          );
        } catch (notifError) {
          this.logger.warn(`Failed to send notifications:`, notifError);
          notificationSent = false;
        }
      }

      // Transform response
      const transformedJob: JobDto = {
        ...updatedJob,
        questions: updatedJob.questions || null,
        status: updatedJob.status as JobStatusEnum,
        workType: updatedJob.workType as WorkTypeEnum,
      };

      this.logger.log(
        `Updated job ${jobId} status to ${updateJobDto.status}. Notifications sent: ${notificationSent} (${notificationCount} recipients)`,
      );

      return {
        message: RESPONSE_MESSAGE.SUCCESS,
        code: RESPONSE_CODE.SUCCESS,
        data: {
          job: transformedJob,
          notificationSent,
          notificationCount,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to update job ${jobId} status:`, error);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to update job status");
    }
  }
}
