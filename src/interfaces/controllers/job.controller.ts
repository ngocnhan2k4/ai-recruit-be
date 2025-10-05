import { JobUseCases } from "@/use-cases/job/job.use-case";
import { Controller, Get, Query, UseGuards, Post, Body } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponse, ApiResponseDto } from "../dtos";
import {
  QueryJobDto,
  JobPaginationResponseDto,
} from "../dtos/jobs/query-job.dto";
import { StatisticsJobFilterRequestDto, StatisticsJobResponse } from "../dtos";
import {
  ApplyJobResponseDto,
  UserInteractionResponseDto,
  SaveJobDto,
  HideJobDto,
} from "../dtos/jobs/job-interaction.dto";
import { GuestGuard } from "@/frameworks/auth-services/guards/guest.guard";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { GetUser } from "@/common/decorators/get-user.decorator";
import type { TokenPayload } from "@/common/types/token";
import { AnonymousId } from "@/common/constants/roles";

@ApiTags("Jobs")
@Controller("jobs")
export class JobController {
  constructor(private readonly jobUseCases: JobUseCases) {}

  @ApiOperation({
    summary: "Get all jobs",
    description:
      "Retrieve a list of all jobs with cursor-based pagination and filtering by salary range, experience, province, company, and work type.",
  })
  @UseGuards(GuestGuard)
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
      userId: user?.userId !== AnonymousId ? user?.userId : undefined, // Pass user ID to filter hidden jobs and get isSaved status (exclude anonymous users)
    };

    return this.jobUseCases.getAllJobs(query.limit, query.cursor, filters);
  }

  @ApiOperation({
    summary: "Get job statistics",
    description:
      "Retrieve job statistics including frequently posted jobs, count of open jobs, and salary statistics based on experience.",
  })
  @UseGuards(GuestGuard)
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
  ): Promise<ApiResponse<ApplyJobResponseDto>> {
    return await this.jobUseCases.applyJob(user.userId);
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
    const save = saveJobDto.save !== undefined ? saveJobDto.save : true;
    return await this.jobUseCases.saveJob(user.userId, saveJobDto.jobId, save);
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
    const hide = hideJobDto.hide !== undefined ? hideJobDto.hide : true;
    return await this.jobUseCases.hideJob(user.userId, hideJobDto.jobId, hide);
  }
}
