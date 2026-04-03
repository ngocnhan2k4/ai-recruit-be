import { JobUseCases } from "@/use-cases/job/job.use-case";
import {
  Controller,
  Get,
  Query,
  UseGuards,
  Post,
  Body,
  Put,
  Delete,
  Param,
  UseInterceptors,
} from "@nestjs/common";
import { CacheTTL } from "@nestjs/cache-manager";
import { HttpCacheInterceptor } from "@/common/interceptors/http-cache.interceptor";
import { LONG_TTL } from "@/common/constants";
import { ApiOperation, ApiTags, ApiBearerAuth } from "@nestjs/swagger";
import {
  ApiResponse,
  ApiResponseDto,
  TopInMarketDtoResponse,
} from "../../dtos";
import { QueryJobDto, CreateJobDto } from "@/interfaces/dtos";
import {
  JobDto,
  JobPaginationResponseDto,
  SavedJobsResponseDto,
  AppliedJobsResponseDto,
  JobResponseDto,
} from "@/interfaces/dtos";
import {
  StatisticsJobFilterRequestDto,
  StatisticsJobResponse,
  CompareStatisticsFilterRequestDto,
  CompareStatisticsResponseDto,
  CompareTopInMarketResponseDto,
} from "@/interfaces/dtos";
import {
  ApplyJobResponseDto,
  UserInteractionResponseDto,
  SaveJobDto,
  //HideJobDto,
  ApplyJobDto,
  UpdateApplyJobDto,
  ApplyJobQueryDto,
} from "@/interfaces/dtos";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { OptionalJwtAuthGuard } from "@/frameworks/auth-services/guards";
import { GetUser } from "@/common/decorators";
import type { TokenPayload } from "@/common/types";
import { GeneralQueryDto } from "@/interfaces/dtos";
import { PaginatedResultDto } from "@/interfaces/dtos";
import { RoleEnum } from "@/common/constants";

@ApiTags("Jobs")
@ApiBearerAuth()
@Controller("jobs")
export class JobController {
  constructor(private readonly jobUseCases: JobUseCases) {}

  @ApiOperation({
    summary: "Get all jobs",
    description:
      "Retrieve a list of all jobs with cursor-based pagination and filtering by salary range, experience, province, company, and work type. from es",
  })
  @UseGuards(OptionalJwtAuthGuard)
  @ApiResponseDto(JobPaginationResponseDto)
  @Get()
  async getJobs(
    @Query() query: QueryJobDto,
    @GetUser() user?: TokenPayload,
  ): Promise<ApiResponse<JobPaginationResponseDto>> {
    return this.jobUseCases.getJobs({
      ...query,
      user: user && {
        ...user,
        roles: [RoleEnum.USER],
      },
    });
  }

  @ApiOperation({
    summary: "Get all jobs",
    description:
      "Retrieve a list of all jobs with cursor-based pagination and filtering by salary range, experience, province, company, and work type. from database",
  })
  @UseGuards(OptionalJwtAuthGuard)
  @ApiResponseDto(JobPaginationResponseDto)
  @Get("v2")
  async getJobsV2(
    @Query() query: QueryJobDto,
    @GetUser() user?: TokenPayload,
  ): Promise<ApiResponse<JobPaginationResponseDto>> {
    return this.jobUseCases.getJobsV2({
      ...query,
      user: user && {
        ...user,
        roles: [RoleEnum.USER],
      },
    });
  }

  @ApiOperation({
    summary: "Get job statistics",
    description:
      "Retrieve job statistics including frequently posted jobs, count of open jobs, and salary statistics based on experience.",
  })
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(LONG_TTL)
  @Get("statistics")
  async getJobStatistics(
    @Query() filter: StatisticsJobFilterRequestDto,
  ): Promise<ApiResponse<StatisticsJobResponse>> {
    return this.jobUseCases.getJobStatistics(filter);
  }

  @ApiOperation({
    summary: "Get top in market",
    description:
      "Retrieve top applied jobs, top employers, and top job categories in the market.",
  })
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(LONG_TTL)
  @Get("statistics/top-in-market")
  async getTopInMarket(
    @Query() filter: StatisticsJobFilterRequestDto,
  ): Promise<ApiResponse<TopInMarketDtoResponse>> {
    return this.jobUseCases.getTopInMarket(filter);
  }

  @ApiOperation({
    summary: "Compare job statistics across multiple categories",
    description:
      "Retrieve job statistics for multiple categories in a single request for comparison.",
  })
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(LONG_TTL)
  @Get("statistics/compare")
  async getCompareStatistics(
    @Query() filter: CompareStatisticsFilterRequestDto,
  ): Promise<ApiResponse<CompareStatisticsResponseDto>> {
    return this.jobUseCases.getCompareStatistics(filter);
  }

  @ApiOperation({
    summary: "Compare top-in-market data across multiple categories",
    description:
      "Retrieve top-in-market data for multiple categories in a single request for comparison.",
  })
  @UseInterceptors(HttpCacheInterceptor)
  @CacheTTL(LONG_TTL)
  @Get("statistics/top-in-market/compare")
  @ApiResponseDto(CompareTopInMarketResponseDto)
  async getCompareTopInMarket(
    @Query() filter: CompareStatisticsFilterRequestDto,
  ): Promise<ApiResponse<CompareTopInMarketResponseDto>> {
    return this.jobUseCases.getCompareTopInMarket(filter);
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
    summary: "Update job application status",
    description:
      "Update the status of a job application and send notification to applicants",
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
    @Param("applyId") applyId: string,
  ): Promise<ApiResponse<ApplyJobResponseDto>> {
    return await this.jobUseCases.getApplyJobById(applyId);
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
  ): Promise<ApiResponse<PaginatedResultDto<ApplyJobResponseDto>>> {
    return await this.jobUseCases.getApplyJobs(query);
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
  // [TODO] remove later
  // @ApiOperation({
  //   summary: "Hide a job",
  //   description: "Hide a job from future search results",
  // })
  // @UseGuards(JwtAuthGuard)
  // @ApiResponseDto(UserInteractionResponseDto)
  // @Post("hide")
  // async hideJob(
  //   @GetUser() user: TokenPayload,
  //   @Body() hideJobDto: HideJobDto,
  // ): Promise<ApiResponse<UserInteractionResponseDto | null>> {
  //   return await this.jobUseCases.hideJob(
  //     user.userId,
  //     hideJobDto.jobId,
  //     hideJobDto.hide!,
  //   );
  // }

  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(JobDto)
  @Post()
  async createJob(
    @GetUser() user: TokenPayload,
    @Body() createJobDto: CreateJobDto,
  ): Promise<ApiResponse<JobDto>> {
    return await this.jobUseCases.createJob(user.userId, createJobDto);
  }

  @ApiOperation({
    summary: "Get job by ID",
    description: "Retrieve a specific job by its ID",
  })
  @UseGuards(OptionalJwtAuthGuard)
  @ApiResponseDto(JobResponseDto)
  @Get(":id")
  async getJobById(
    @Param("id") jobId: string,
    @GetUser() user?: TokenPayload,
  ): Promise<ApiResponse<JobResponseDto>> {
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

  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "Delete a job",
    description: "Delete a job posting (for organization)",
  })
  @Delete(":id")
  async deleteJob(
    @GetUser() user: TokenPayload,
    @Param("id") jobId: string,
    @Query("organizationId") organizationId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return await this.jobUseCases.deleteJob(user, jobId, organizationId);
  }
}
