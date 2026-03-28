import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  Body,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponse, ApiResponseDto } from "@/interfaces/dtos";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards";
import { JobSyncUseCases } from "@/use-cases/job-sync/job-sync.use-case";
import { SyncFromElasticsearchRequestDto } from "@/interfaces/dtos";
import { SyncFromElasticsearchResponseDto } from "@/interfaces/dtos";

@ApiTags("Job Sync Admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
@Controller("admin/job-sync")
@ApiBearerAuth()
export class AdminJobSyncController {
  constructor(private readonly jobSyncUseCases: JobSyncUseCases) {}

  @ApiOperation({
    summary: "Initialize Elasticsearch index",
    description:
      "Initialize the Elasticsearch index for jobs. This should be called once when setting up the system.",
  })
  @ApiResponseDto("string")
  @Post("initialize")
  async initializeIndex(): Promise<ApiResponse<{ message: string }>> {
    return await this.jobSyncUseCases.initializeIndex();
  }

  @ApiOperation({
    summary: "Sync all active jobs to Elasticsearch",
    description:
      "Manually trigger a full sync of all active jobs to Elasticsearch. This will sync all jobs in batches.",
  })
  @ApiResponseDto("string")
  @Post("sync-all")
  async syncAllActiveJobs(): Promise<
    ApiResponse<{ totalSynced: number; message: string }>
  > {
    return await this.jobSyncUseCases.syncAllActiveJobs();
  }

  @ApiOperation({
    summary: "Get Elasticsearch sync status",
    description:
      "Return Elasticsearch jobs count and DB syncable jobs count for manual sync monitoring.",
  })
  @ApiResponseDto("string")
  @Get("status")
  async getSyncStatus(): Promise<
    ApiResponse<{
      esCount: number;
      dbCount: number;
    }>
  > {
    return await this.jobSyncUseCases.getSyncStatus();
  }

  @ApiOperation({
    summary: "Delete Elasticsearch jobs index",
    description: "Delete the whole Elasticsearch jobs index.",
  })
  @ApiResponseDto("string")
  @Delete("index")
  async deleteJobsIndex(): Promise<ApiResponse<{ message: string }>> {
    return await this.jobSyncUseCases.deleteJobsIndex();
  }

  @ApiOperation({
    summary: "Delete a job from Elasticsearch",
    description:
      "Remove a specific job from the Elasticsearch index by job ID.",
  })
  @ApiResponseDto("string")
  @Delete(":jobId")
  async deleteJob(
    @Param("jobId") jobId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return await this.jobSyncUseCases.deleteJob(jobId);
  }

  @ApiOperation({
    summary: "Sync data from another Elasticsearch instance",
    description:
      "Sync data from a remote Elasticsearch instance to the current one. ",
  })
  @ApiResponseDto(SyncFromElasticsearchResponseDto)
  @Post("sync-from-es")
  async syncFromElasticsearch(
    @Body() dto: SyncFromElasticsearchRequestDto,
  ): Promise<ApiResponse<SyncFromElasticsearchResponseDto>> {
    return await this.jobSyncUseCases.syncFromElasticsearch(dto);
  }
}
