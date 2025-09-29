import { JobUseCases } from "@/use-cases/job/job.use-case";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponse, ApiResponseDto } from "../dtos";
import { JobResponse, QueryJobDto } from "../dtos/jobs/query-job.dto";
import { StatisticsJobFilterDto, StatisticsJobResponse } from "../dtos";
import { GuestGuard } from "@/frameworks/auth-services/guards/guest.guard";

@ApiTags("Jobs")
@Controller("jobs")
export class JobController {
  constructor(private readonly jobUseCases: JobUseCases) {}

  @ApiOperation({
    summary: "Get all jobs",
    description:
      "Retrieve a list of all jobs with optional pagination and keyword filtering.",
  })
  @UseGuards(GuestGuard)
  @ApiResponseDto(JobResponse, { isArray: true })
  @Get()
  async getAll(
    @Query() query: QueryJobDto,
  ): Promise<ApiResponse<JobResponse[]>> {
    return this.jobUseCases.getAllJobs(
      query.limit,
      query.offset,
      query.keyword,
    );
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
    @Query() filter: StatisticsJobFilterDto,
  ): Promise<ApiResponse<StatisticsJobResponse>> {
    return this.jobUseCases.getStatisticsJobs(filter);
  }
}
