import { OrganizationUseCase } from "@/use-cases/organization/organization.use-case";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards";
import {
  ApiResponseDto,
  OrganizationTrendsQueryDto,
  OrganizationTrendsResponseDto,
} from "@/interfaces/dtos";
import { ApiResponse } from "@/interfaces/dtos";

@ApiTags("Organization Admin")
@Controller("admin/organizations")
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
export class OrganizationAdminController {
  constructor(private readonly organizationUseCase: OrganizationUseCase) {}

  @Get("trends")
  @ApiOperation({
    summary: "Get organization trends",
    description: "Get organization creation trends over time",
  })
  @ApiResponseDto(OrganizationTrendsResponseDto)
  async getOrganizationTrends(
    @Query() query: OrganizationTrendsQueryDto,
  ): Promise<ApiResponse<OrganizationTrendsResponseDto>> {
    return this.organizationUseCase.getOrganizationTrends(query);
  }
}
