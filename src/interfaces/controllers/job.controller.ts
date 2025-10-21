import { JobUseCases } from "@/use-cases/job/job.use-case";
import {
  Controller,
  Get,
  Query,
  UseGuards,
  Post,
  Body,
  Put,
  Param,
  Delete,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponse, ApiResponseDto } from "../dtos";
import {
  QueryJobDto,
  JobPaginationResponseDto,
  SavedJobsResponseDto,
  AppliedJobsResponseDto,
  JobResponse,
} from "../dtos/jobs/query-job.dto";
import { CreateJobDto, UpdateJobDto, JobDto } from "../dtos/jobs/job.dto";
import { StatisticsJobFilterRequestDto, StatisticsJobResponse } from "../dtos";
import {
  ApplyJobResponseDto,
  UserInteractionResponseDto,
  SaveJobDto,
  HideJobDto,
  ApplyJobDto,
  UpdateApplyJobDto,
  ApplyJobQueryDto,
} from "../dtos/jobs/job-interaction.dto";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "@/frameworks/auth-services/guards/optional-jwt-auth.guard";
import { GetUser } from "@/common/decorators/get-user.decorator";
import type { TokenPayload } from "@/common/types/token";
import { GeneralQueryDto } from "../dtos/common/query";
import { PaginatedResultDto } from "../dtos/common/query";

@ApiTags("Jobs")
@Controller("jobs")
export class JobController {
  constructor(private readonly jobUseCases: JobUseCases) {}

  @ApiOperation({
    summary: "Get all jobs",
    description:
      "Retrieve a list of all jobs with cursor-based pagination and filtering by salary range, experience, province, company, and work type.",
  })
  @UseGuards(OptionalJwtAuthGuard)
  @ApiResponseDto(JobPaginationResponseDto)
  @Get()
  async getAll(
    @Query() query: QueryJobDto,
    @GetUser() user?: TokenPayload,
  ): Promise<ApiResponse<JobPaginationResponseDto>> {
    const filters = {
      keyword: query.keyword,
      salaryRange:
        query.salaryMin !== undefined || query.salaryMax !== undefined
          ? { min: query.salaryMin, max: query.salaryMax }
          : undefined,
      experienceRange:
        query.experienceMin !== undefined || query.experienceMax !== undefined
          ? { min: query.experienceMin, max: query.experienceMax }
          : undefined,
      provinceId: query.provinceId,
      companyId: query.companyId,
      workType: query.workType,
      status: query.status,
      user: user ? user : undefined, // Pass user to filter hidden jobs and get isSaved status
    };

    return this.jobUseCases.getAllJobs(query.limit, query.cursor, filters);
  }

  @ApiOperation({
    summary: "Get job statistics",
    description:
      "Retrieve job statistics including frequently posted jobs, count of open jobs, and salary statistics based on experience.",
  })
  @ApiResponseDto(StatisticsJobResponse)
  @Get("statistics")
  async getStatisticsJob(
    @Query() filter: StatisticsJobFilterRequestDto,
  ): Promise<ApiResponse<StatisticsJobResponse>> {
    return this.jobUseCases.getStatisticsJobs(filter);
  }

  @ApiOperation({
    summary: "Apply for a job",
    description: "Submit an application for a specific job",
  })
  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(ApplyJobResponseDto)
  @Post("apply")
  async applyJob(
    @GetUser() user: TokenPayload,
    @Body() applyJobDto: ApplyJobDto,
  ): Promise<ApiResponse<ApplyJobResponseDto>> {
    return await this.jobUseCases.applyJob(user.userId, applyJobDto);
  }

  @ApiOperation({
    summary: "Update job application",
    description:
      "Update application status, answers, and CV. To change answers or userCvId, status must be 'applied'",
  })
  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(ApplyJobResponseDto)
  @Put("apply/:applyId")
  async updateApplyJob(
    @GetUser() user: TokenPayload,
    @Param("applyId") applyId: string,
    @Body() updateApplyJobDto: UpdateApplyJobDto,
  ): Promise<ApiResponse<ApplyJobResponseDto>> {
    return await this.jobUseCases.updateApplyJob(
      user.userId,
      applyId,
      updateApplyJobDto,
    );
  }

  @ApiOperation({
    summary: "Get job application by ID",
    description: "Retrieve a specific job application by its ID",
  })
  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(ApplyJobResponseDto)
  @Get("apply/:applyId")
  async getApplyJobById(
    @GetUser() user: TokenPayload,
    @Param("applyId") applyId: string,
  ): Promise<ApiResponse<ApplyJobResponseDto>> {
    return await this.jobUseCases.getApplyJobById(user.userId, applyId);
  }

  @ApiOperation({
    summary: "Get job applications by job ID",
    description: "Retrieve a job applications by job ID",
  })
  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(ApplyJobResponseDto)
  @Get("apply")
  async getApplyJobs(
    @Query() query: ApplyJobQueryDto,
  ): Promise<ApiResponse<ApplyJobResponseDto[]>> {
    return await this.jobUseCases.getApplyJobs(query.jobId);
  }

  @ApiOperation({
    summary: "Save a job",
    description: "Save a job for later viewing",
  })
  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(UserInteractionResponseDto)
  @Post("save")
  async saveJob(
    @GetUser() user: TokenPayload,
    @Body() saveJobDto: SaveJobDto,
  ): Promise<ApiResponse<UserInteractionResponseDto | null>> {
    return await this.jobUseCases.saveJob(
      user.userId,
      saveJobDto.jobId,
      saveJobDto.save!,
    );
  }

  @ApiOperation({
    summary: "Hide a job",
    description: "Hide a job from future search results",
  })
  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(UserInteractionResponseDto)
  @Post("hide")
  async hideJob(
    @GetUser() user: TokenPayload,
    @Body() hideJobDto: HideJobDto,
  ): Promise<ApiResponse<UserInteractionResponseDto | null>> {
    return await this.jobUseCases.hideJob(
      user.userId,
      hideJobDto.jobId,
      hideJobDto.hide!,
    );
  }

  @ApiOperation({
    summary: "Create a new job",
    description: "Create a new job posting",
  })
  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(JobDto)
  @Post()
  async createJob(
    @Body() createJobDto: CreateJobDto,
  ): Promise<ApiResponse<JobDto>> {
    return await this.jobUseCases.createJob(createJobDto);
  }

  @ApiOperation({
    summary: "Update a job",
    description: "Update an existing job posting",
  })
  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(JobDto)
  @Put(":id")
  async updateJob(
    @Param("id") jobId: string,
    @Body() updateJobDto: UpdateJobDto,
  ): Promise<ApiResponse<JobDto>> {
    return await this.jobUseCases.updateJob(jobId, updateJobDto);
  }

  @ApiOperation({
    summary: "Delete a job",
    description: "Delete a job posting (soft delete)",
  })
  @UseGuards(JwtAuthGuard)
  @Delete(":id")
  async deleteJob(
    @Param("id") jobId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return await this.jobUseCases.deleteJob(jobId);
  }

  @ApiOperation({
    summary: "Get job by ID",
    description: "Retrieve a specific job by its ID",
  })
  @UseGuards(OptionalJwtAuthGuard)
  @ApiResponseDto(JobResponse)
  @Get(":id")
  async getJobById(
    @Param("id") jobId: string,
    @GetUser() user?: TokenPayload,
  ): Promise<ApiResponse<JobResponse>> {
    const userId = user ? user.userId : undefined;
    return await this.jobUseCases.getJobById(jobId, userId);
  }

  @ApiOperation({
    summary: "Get all saved jobs for the authenticated user",
    description: "Retrieve a list of all jobs saved by the authenticated user.",
  })
  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(SavedJobsResponseDto, { isArray: true })
  @Get("saved")
  async getAllSavedJobs(
    @GetUser() user: TokenPayload,
    @Query() query: GeneralQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<SavedJobsResponseDto>>> {
    return await this.jobUseCases.getAllSavedJobs(user.userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(Number)
  @Get("saved/count")
  async getNumberOfSavedJobs(
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<number>> {
    return await this.jobUseCases.getNumberOfSavedJobs(user.userId);
  }

  @ApiOperation({
    summary: "Get applied jobs for the authenticated user",
    description:
      "Retrieve a list of all jobs applied by the authenticated user.",
  })
  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(AppliedJobsResponseDto, { isArray: true })
  @Get("applied")
  async getAllAppliedJobs(
    @GetUser() user: TokenPayload,
    @Query() query: GeneralQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<AppliedJobsResponseDto>>> {
    return await this.jobUseCases.getAllAppliedJobs(user.userId, query);
  }
  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(Number)
  @Get("applied/count")
  async getNumberOfAppliedJobs(
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<number>> {
    return await this.jobUseCases.getNumberOfAppliedJobs(user.userId);
  }
}
