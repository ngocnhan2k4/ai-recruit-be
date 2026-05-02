import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponse, ApiResponseDto } from "@/interfaces/dtos";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards";
import { CvSyncUseCases } from "@/use-cases/cv-sync/cv-sync.use-case";
import { SyncFromElasticsearchRequestDto } from "@/interfaces/dtos";
import { SyncFromElasticsearchResponseDto } from "@/interfaces/dtos";

@ApiTags("CV Sync Admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
@Controller("admin/cv-sync")
export class AdminCvSyncController {
  constructor(private readonly cvSyncUseCases: CvSyncUseCases) {}

  @ApiOperation({
    summary: "Initialize Elasticsearch CV index",
    description: "Initialize the Elasticsearch index for CVs.",
  })
  @ApiResponseDto("string")
  @Post("initialize")
  initializeIndex(): Promise<ApiResponse<{ message: string }>> {
    return this.cvSyncUseCases.initializeIndex();
  }

  @ApiOperation({
    summary: "Sync all completed CVs to Elasticsearch",
    description:
      "Manually trigger a full sync of all completed (extracted) CVs to Elasticsearch.",
  })
  @ApiResponseDto("string")
  @Post("sync-all")
  syncAllCompletedCvs(): Promise<
    ApiResponse<{ totalSynced: number; message: string }>
  > {
    return this.cvSyncUseCases.syncAllCompletedCvs();
  }

  @ApiOperation({
    summary: "Get CV Elasticsearch sync status",
    description:
      "Return Elasticsearch CVs count and DB syncable/indexed counts for manual sync monitoring.",
  })
  @ApiResponseDto("string")
  @Get("status")
  getSyncStatus(): Promise<
    ApiResponse<{
      esCount: number;
      dbCount: number;
    }>
  > {
    return this.cvSyncUseCases.getSyncStatus();
  }

  @ApiOperation({
    summary: "Delete Elasticsearch CVs index",
    description: "Delete the whole Elasticsearch CVs index.",
  })
  @ApiResponseDto("string")
  @Delete("index")
  deleteCvsIndex(): Promise<ApiResponse<{ message: string }>> {
    return this.cvSyncUseCases.deleteCvsIndex();
  }

  @ApiOperation({
    summary: "Delete a CV from Elasticsearch",
    description: "Remove a specific CV from the Elasticsearch index by CV ID.",
  })
  @ApiResponseDto("string")
  @Delete(":cvId")
  deleteCv(
    @Param("cvId") cvId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.cvSyncUseCases.deleteCv(cvId);
  }

  @ApiOperation({
    summary: "Sync CV data from another Elasticsearch instance",
    description:
      "Sync data from a remote Elasticsearch instance to the current one.",
  })
  @ApiResponseDto(SyncFromElasticsearchResponseDto)
  @Post("sync-from-es")
  syncFromElasticsearch(
    @Body() dto: SyncFromElasticsearchRequestDto,
  ): Promise<ApiResponse<SyncFromElasticsearchResponseDto>> {
    return this.cvSyncUseCases.syncFromElasticsearch(dto);
  }
}
