import { JobMatchingUseCases } from "@/use-cases/job-matching/job-matching.use-cases";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponse, ApiResponseDto, PaginatedResultDto } from "../../dtos";
import { QueryMatchedJobsDto, JobMatchResultDto } from "../../dtos";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { GetUser } from "@/common/decorators";
import type { TokenPayload } from "@/common/types";
import { JobStatusEnum } from "@/core";
import { RoleEnum } from "@/common/constants";

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
        sortBy: query.sortBy,
        sortDirection: query.sortDirection,
        keyword: query.keyword,
        salaryMin: query.salaryMin,
        salaryMax: query.salaryMax,
        experienceMin: query.experienceMin,
        experienceMax: query.experienceMax,
        provinceId: query.provinceId,
        categoryId: query.categoryId,
        organizationId: query.organizationId,
        skillIds: query.skillIds,
        fromDate: query.fromDate,
        toDate: query.toDate,
        workType: query.workType,
        status: JobStatusEnum.ACTIVE,
        user: {
          ...user,
          roles: [RoleEnum.USER],
        },
      },
    );
  }
}
