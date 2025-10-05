import { JobUseCases } from "@/use-cases/job/job.use-case";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponse, ApiResponseDto } from "../dtos";
import {
  QueryJobDto,
  JobPaginationResponseDto,
} from "../dtos/jobs/query-job.dto";
import { StatisticsJobFilterRequestDto, StatisticsJobResponse } from "../dtos";
import { GuestGuard } from "@/frameworks/auth-services/guards/guest.guard";

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
}
