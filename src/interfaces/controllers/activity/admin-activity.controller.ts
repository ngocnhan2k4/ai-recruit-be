import { Controller, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  ApiResponse,
  ApiResponseDto,
  AdminAuditItemDto,
  AdminAuditQueryDto,
  PaginatedResultDto,
} from "@/interfaces/dtos";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards";
import { ActivityUseCase } from "@/use-cases/activity/activity.use-case";

@ApiTags("Activity Admin")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
@Controller("admin/activities")
export class AdminActivityController {
  constructor(private readonly activityUseCase: ActivityUseCase) {}

  @ApiOperation({
    summary: "Ensure activities storage is ready",
    description:
      "No-op for Postgres (schema managed by Drizzle). Kept for admin tooling compatibility.",
  })
  @ApiResponseDto("string")
  @Post("index/init")
  async initializeIndex(): Promise<ApiResponse<{ message: string }>> {
    return this.activityUseCase.initializeIndex();
  }

  @ApiOperation({
    summary: "List activity logs (technical)",
    description:
      "Filter by targetType, action, createdBy, organizationId, and date range. Cursor pagination via `cursor` + `limit`.",
  })
  @ApiResponseDto(AdminAuditItemDto, { isArray: true })
  @Get()
  async getAudits(
    @Query() query: AdminAuditQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<AdminAuditItemDto>>> {
    return this.activityUseCase.getAdminAudits(query);
  }

  @ApiOperation({ summary: "Get activity log by ID" })
  @ApiResponseDto(AdminAuditItemDto)
  @Get(":id")
  async getAuditById(
    @Param("id") id: string,
  ): Promise<ApiResponse<AdminAuditItemDto>> {
    return this.activityUseCase.getAdminAuditById(id);
  }
}
