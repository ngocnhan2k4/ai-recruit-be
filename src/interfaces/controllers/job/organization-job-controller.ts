import { JobUseCases } from "@/use-cases/job/job.use-case";
import {
  Body,
  Controller,
  Delete,
  Put,
  Param,
  UseGuards,
  Post,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GetUser } from "@/common/decorators";
import { type TokenPayload } from "@/common/types";
import {
  ApiResponse,
  ApiResponseDto,
  CreateJobDto,
  UpdateJobDto,
  JobDto,
} from "@/interfaces/dtos";
import {
  JwtAuthGuard,
  OrganizationAuthorizeGuard,
} from "@/frameworks/auth-services/guards";

@ApiTags("Organization Jobs")
@ApiBearerAuth()
@Controller("organizations/:orgId")
export class OrganizationJobController {
  constructor(private readonly jobUseCases: JobUseCases) {}

  @ApiOperation({
    summary: "Create organization job",
    description:
      "Create a new job posting under the specified organization. The caller must be an active member of the organization.",
  })
  @ApiResponseDto(JobDto)
  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @Post("jobs")
  async createJob(
    @Body() createJobDto: CreateJobDto,
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<JobDto>> {
    return await this.jobUseCases.createJob(user.userId, createJobDto);
  }

  @ApiOperation({
    summary: "Update organization job",
    description:
      "Update an existing job posting scoped to a specific organization. Status is reset to pending approval only when key content fields are changed.",
  })
  @Put("jobs/:jobId")
  @ApiResponseDto(JobDto)
  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  async updateJob(
    @Param("jobId") jobId: string,
    @Body() updateJobDto: UpdateJobDto,
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<JobDto>> {
    return await this.jobUseCases.updateJob(jobId, updateJobDto, user.userId);
  }

  @ApiOperation({
    summary: "Delete a job",
    description: "Delete a job posting (for organization)",
  })
  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @Delete("jobs/:jobId")
  async deleteJob(
    @GetUser() user: TokenPayload,
    @Param("jobId") jobId: string,
    @Param("orgId") organizationId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return await this.jobUseCases.deleteJob(user, jobId, organizationId);
  }
}
