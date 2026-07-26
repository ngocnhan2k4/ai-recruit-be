import { JobUseCases } from "@/use-cases/job/job.use-case";
import {
  Body,
  Controller,
  Delete,
  Put,
  Param,
  UseGuards,
  Post,
  Get,
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
  JobCandidateRecommendationDto,
  JobCopilotRequestDto,
  JobCopilotResponseDto,
  SaveJobCopilotDraftDto,
  JobCopilotDraftResponseDto,
  JobSalaryInsightDto,
} from "@/interfaces/dtos";
import {
  JwtAuthGuard,
  OrganizationAuthorizeGuard,
} from "@/frameworks/auth-services/guards";
import { JobCopilotUseCase } from "@/use-cases/job-copilot/job-copilot.use-case";
import { JobCopilotDraftUseCase } from "@/use-cases/job-copilot/job-copilot-draft.use-case";

@ApiTags("Organization Jobs")
@ApiBearerAuth()
@Controller("organizations/:orgId")
export class OrganizationJobController {
  constructor(
    private readonly jobUseCases: JobUseCases,
    private readonly jobCopilotUseCase: JobCopilotUseCase,
    private readonly jobCopilotDraftUseCase: JobCopilotDraftUseCase,
  ) {}

  @ApiOperation({ summary: "Get the recruiter's active Job Copilot draft" })
  @ApiResponseDto(JobCopilotDraftResponseDto)
  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @Get("job-copilot/draft")
  getJobCopilotDraft(
    @Param("orgId") orgId: string,
    @GetUser() user: TokenPayload,
  ) {
    return this.jobCopilotDraftUseCase.get(orgId, user.userId);
  }

  @ApiOperation({ summary: "Create or update a Job Copilot draft" })
  @ApiResponseDto(JobCopilotDraftResponseDto)
  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @Put("job-copilot/draft")
  saveJobCopilotDraft(
    @Param("orgId") orgId: string,
    @GetUser() user: TokenPayload,
    @Body() input: SaveJobCopilotDraftDto,
  ) {
    return this.jobCopilotDraftUseCase.save(orgId, user.userId, input);
  }

  @ApiOperation({ summary: "Soft delete the active Job Copilot draft" })
  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @Delete("job-copilot/draft")
  deleteJobCopilotDraft(
    @Param("orgId") orgId: string,
    @GetUser() user: TokenPayload,
  ) {
    return this.jobCopilotDraftUseCase.remove(orgId, user.userId);
  }

  @ApiOperation({
    summary: "Generate or review a job description with AI",
  })
  @ApiResponseDto(JobCopilotResponseDto)
  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @Post("job-copilot")
  async runJobCopilot(
    @Body() request: JobCopilotRequestDto,
  ): Promise<ApiResponse<JobCopilotResponseDto>> {
    return this.jobCopilotUseCase.run(request);
  }

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

  @ApiOperation({
    summary: "Get recommended CVs for a job",
    description:
      "Query Elasticsearch directly and return top N candidate CVs ranked by matching score for this organization job.",
  })
  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @ApiResponseDto(JobCandidateRecommendationDto, { isArray: true })
  @Get("jobs/:jobId/recommended-cvs")
  async getRecommendedCvs(
    @Param("jobId") jobId: string,
    @Param("orgId") orgId: string,
  ): Promise<ApiResponse<JobCandidateRecommendationDto[]>> {
    return this.jobUseCases.getRecommendedCvsForJob(jobId, orgId);
  }

  @ApiOperation({
    summary: "Get salary market insight for a job",
    description:
      "Query Elasticsearch for similar active jobs posted in the last 12 months and return the median salary range for market comparison.",
  })
  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @ApiResponseDto(JobSalaryInsightDto)
  @Get("jobs/:jobId/salary-insight")
  async getSalaryInsight(
    @Param("jobId") jobId: string,
    @Param("orgId") orgId: string,
  ): Promise<ApiResponse<JobSalaryInsightDto>> {
    return this.jobUseCases.getSalaryInsight(jobId, orgId);
  }
}
