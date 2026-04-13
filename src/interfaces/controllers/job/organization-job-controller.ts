import { JobUseCases } from "@/use-cases/job/job.use-case";
import { Body, Controller, Put, Param, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { GetUser } from "@/common/decorators";
import { type TokenPayload } from "@/common/types";
import {
  ApiResponse,
  ApiResponseDto,
  UpdateJobDto,
  JobDto,
} from "@/interfaces/dtos";
import {
  JwtAuthGuard,
  OrganizationAuthorizeGuard,
} from "@/frameworks/auth-services/guards";

@ApiTags("Organization Jobs")
@ApiBearerAuth()
@Controller()
export class OrganizationJobController {
  constructor(private readonly jobUseCases: JobUseCases) {}

  @ApiOperation({
    summary: "Update organization job",
    description:
      "Update an existing job posting scoped to a specific organization. Status is reset to pending approval only when key content fields are changed.",
  })
  @ApiResponseDto(JobDto)
  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @Put("jobs/:jobId")
  async updateJob(
    @Param("jobId") jobId: string,
    @Body() updateJobDto: UpdateJobDto,
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<JobDto>> {
    return await this.jobUseCases.updateJob(jobId, updateJobDto, user.userId);
  }
}
