import { Injectable, Logger } from "@nestjs/common";
import { IJobRepository } from "@/core/abstracts";
import { ApiResponse } from "@/interfaces/dtos";
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
  JobResponse,
} from "@/interfaces/dtos";
import { Skill, Job, Company, Province } from "@/core";
import { BadRequestException } from "@nestjs/common";
import { JobDto, SavedJobsResponseDto } from "@/interfaces/dtos";
import {
  JobFilters,
  StatisticsJobFilter,
} from "@/core/abstracts/repositories/job-repository.abstract";
@Injectable()
export class JobUseCases {
  private readonly logger = new Logger(JobUseCases.name);
  constructor(private readonly jobRepository: IJobRepository) {}

  async getAllJobs(
    limit?: number,
    cursor?: string,
    filters?: JobFilters & { userId?: string },
  ): Promise<
    ApiResponse<{
      paginationData: {
        job: JobDto;
        provinces: Province[];
        company: Company;
        skills: Skill[];
        isSaved?: boolean;
        isApplied?: boolean;
        applyStatus?: string;
        applyId?: string;
      }[];
      nextCursor?: string;
      hasNextPage: boolean;
    }>
  > {
    const result = await this.jobRepository.getAllJobs(limit, cursor, filters);
    this.logger.log(`Fetched ${result.paginationData.length} jobs`);
    // Transform Job entities to JobDtos
    const transformedJobData = result.paginationData.map((item) => ({
      ...item,
      job: {
        ...item.job,
        questions: item.job.questions || null,
      } as JobDto,
    }));

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        paginationData: transformedJobData,
        nextCursor: result.nextCursor,
        hasNextPage: result.hasNextPage,
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
        userId,
        applyJobDto.jobId,
        applyJobDto.userCvId,
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
        userId,
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
    userId: string,
    applyId: string,
  ): Promise<ApiResponse<ApplyJobResponseDto>> {
    try {
      const result = await this.jobRepository.getApplyJobById(applyId, userId);

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
        status: createJobDto.status || undefined,
        questions: createJobDto.questions || undefined,
        datePosted: createJobDto.datePosted
          ? new Date(createJobDto.datePosted).toISOString().split("T")[0]
          : new Date().toISOString().split("T")[0],
        endDate: createJobDto.endDate
          ? new Date(createJobDto.endDate).toISOString().split("T")[0]
          : null,
      };

      const newJob = await this.jobRepository.createJob(jobData);

      // Transform questions field
      const transformedJob: JobDto = {
        ...newJob,
        questions: newJob.questions || null,
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
      };

      // Convert date strings to date strings if provided
      if (updateJobDto.datePosted) {
        updateData.datePosted = new Date(updateJobDto.datePosted)
          .toISOString()
          .split("T")[0];
      }
      if (updateJobDto.endDate) {
        updateData.endDate = new Date(updateJobDto.endDate)
          .toISOString()
          .split("T")[0];
      }

      const updatedJob = await this.jobRepository.updateJob(jobId, updateData);
      if (!updatedJob) {
        throw new BadRequestException("Failed to update job");
      }

      // Transform questions field
      const transformedJob: JobDto = {
        ...updatedJob,
        questions: updatedJob.questions || null,
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
  ): Promise<ApiResponse<JobResponse>> {
    const job: {
      job: Job;
      provinces: Province[];
      company: Company;
      skills: Skill[];
      isSaved?: boolean;
      isApplied?: boolean;
      applyStatus?: string;
      applyId?: string;
    } | null = await this.jobRepository.getFullJobById(jobId, userId);
    if (!job) {
      throw new BadRequestException({
        message: "[getJobById] [get] Job not found",
        code: RESPONSE_CODE.JOB_NOT_FOUND,
      });
    }

    // Transform questions field
    const transformedJob: JobResponse = {
      ...job,
      job: {
        ...job.job,
        questions: job.job.questions || null,
      },
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
    sort: "createdAt" | "endedAt" = "createdAt",
  ): Promise<ApiResponse<SavedJobsResponseDto[]>> {
    const jobs = await this.jobRepository.getAllSavedJobs(userId, sort);
    const transformedJobs: SavedJobsResponseDto[] = jobs.map((job) => ({
      ...job,
      logoUrl: job.logoUrl || "",
      workType: (job.workType || "onsite") as "remote" | "onsite",
      createdAt: job.createdAt.toISOString(),
      endedAt: job.endedAt!,
      isSaved: true,
    }));

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: transformedJobs,
    };
  }
}
