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
import { ApiResponse, ApiResponseDto } from "../../dtos";
import {
  QueryJobDto,
  CreateJobDto,
  UpdateJobDto,
} from "../../dtos/jobs/job-query.dto";
import {
  JobDto,
  JobCountsDto,
  JobPaginationResponseDto,
} from "../../dtos/jobs/job.dto";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { GetUser } from "@/common/decorators/get-user.decorator";
import type { TokenPayload } from "@/common/types/token";

@ApiTags("Jobs Admin")
@UseGuards(JwtAuthGuard)
@Controller("admin/jobs")
export class JobAdminController {
  constructor(private readonly jobUseCases: JobUseCases) {}

  @ApiOperation({
    summary: "Get all jobs",
    description:
      "Retrieve a list of all jobs with cursor-based pagination and filtering by salary range, experience, province, company, and work type by admin.",
  })
  @ApiResponseDto(JobPaginationResponseDto)
  @Get()
  async getJobsByAdmin(
    @Query() query: QueryJobDto,
    @GetUser() user?: TokenPayload,
  ): Promise<ApiResponse<JobPaginationResponseDto>> {
    return this.jobUseCases.getJobs({ ...query, user });
  }

  @ApiOperation({
    summary: "Create a new job",
    description: "Create a new job posting",
  })
  @ApiResponseDto(JobDto)
  @Post()
  async createJob(
    @Body() createJobDto: CreateJobDto,
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<JobDto>> {
    return await this.jobUseCases.createJob(user.userId, createJobDto);
  }

  @ApiOperation({
    summary: "Update a job",
    description: "Update an existing job posting",
  })
  @ApiResponseDto(JobDto)
  @Put(":id")
  async updateJob(
    @Param("id") jobId: string,
    @Body() updateJobDto: UpdateJobDto,
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<JobDto>> {
    return await this.jobUseCases.updateJob(jobId, {
      ...updateJobDto,
      userId: user.userId,
    });
  }

  @ApiOperation({
    summary: "Delete a job",
    description: "Delete a job posting (soft delete)",
  })
  @Delete(":id")
  async deleteJob(
    @GetUser() user: TokenPayload,
    @Param("id") jobId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return await this.jobUseCases.deleteJob(user, jobId);
  }

  @ApiOperation({
    summary: "Get job counts",
    description: "Return total number of jobs and counts grouped by job status",
  })
  @ApiResponseDto(JobCountsDto)
  @Get("counts")
  async getJobCounts(): Promise<ApiResponse<JobCountsDto>> {
    return await this.jobUseCases.getJobCounts();
  }
}
