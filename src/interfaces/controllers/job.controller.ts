import { JobUseCases } from "@/use-cases/job/job.use-case";
import { Controller, Get, Query } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  StatisticsJobFilterDto,
  StatisticsJobResponse,
} from "../dtos/jobs/statistic-job.dto";
import { ApiResponse, ApiResponseDto } from "../dtos";
import { JobResponse, QueryJobDto } from "../dtos/jobs/query-job.dto";

@ApiTags("Jobs")
@Controller("jobs")
export class JobController {
  constructor(private readonly jobUseCases: JobUseCases) {}

  @ApiOperation({
    summary: "Get all jobs",
    description:
      "Retrieve a list of all jobs with optional pagination and keyword filtering.",
  })
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
  @ApiResponseDto(StatisticsJobResponse)
  @Get("statistics")
  async getStatisticsJob(
    @Query() filter: StatisticsJobFilterDto,
  ): Promise<ApiResponse<StatisticsJobResponse>> {
    return this.jobUseCases.getStatisticsJobs(filter);
  }
}
