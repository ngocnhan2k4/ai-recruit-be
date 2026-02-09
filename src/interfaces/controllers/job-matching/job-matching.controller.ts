import { JobMatchingUseCases } from "@/use-cases/job-matching/job-matching.use-cases";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponse, ApiResponseDto, PaginatedResultDto } from "../../dtos";
import { QueryMatchedJobsDto, JobMatchResultDto } from "../../dtos";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { GetUser } from "@/common/decorators";
import type { TokenPayload } from "@/common/types";
import { JobStatusEnum } from "@/core";

@ApiTags("Job Matching")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@Controller("job-matching")
export class JobMatchingController {
  constructor(private readonly jobMatchingUseCases: JobMatchingUseCases) {}

  @ApiOperation({
    summary: "Get matched jobs with scores for current user",
    description:
      "Query Elasticsearch to find jobs that match the current user's profile (skills, experience, preferences) and return them with relevance scores. Higher scores indicate better matches.",
  })
  @ApiResponseDto(JobMatchResultDto, { isArray: true })
  @Get("matched-jobs")
  async getMatchedJobs(
    @Query() query: QueryMatchedJobsDto,
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<PaginatedResultDto<JobMatchResultDto>>> {
    return await this.jobMatchingUseCases.getMatchedJobsWithScores(
      user.userId,
      {
        cursor: query.cursor,
        limit: query.limit || 20,
        salaryMin: query.salaryMin,
        salaryMax: query.salaryMax,
        provinceIds: query.provinceIds,
        categoryId: query.categoryId,
        workType: query.workType,
        status: JobStatusEnum.ACTIVE,
      },
    );
  }
}
