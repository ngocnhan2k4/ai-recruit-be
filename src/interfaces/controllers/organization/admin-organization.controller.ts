import { OrganizationUseCase } from "@/use-cases/organization/organization.use-case";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiTags } from "@nestjs/swagger";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards";
import {
  GetCompanyDto,
  OrganizationQueryDto,
  AdminUpdateOrganizationUpsertDTO,
  OrganizationWithDetailsDto,
} from "@/interfaces/dtos";
import { ApiResponseDto } from "@/interfaces/dtos/common/api-response.dto";
import { ApiResponse } from "@/interfaces/dtos";

@ApiTags("Organization Admin")
@Controller("admin/organizations")
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
export class OrganizationAdminController {
  constructor(private readonly organizationUseCase: OrganizationUseCase) {}

  @Get()
  @ApiOperation({
    summary: "Get all organizations (admin)",
    description: "Retrieve a paginated list of all organizations for admin.",
  })
  @ApiResponseDto(String)
  async getAllOrganizations(@Query() query: OrganizationQueryDto) {
    return await this.organizationUseCase.getOrganizationsByAdmin(query);
  }

  @Get(":orgId")
  @ApiOperation({
    summary: "Get organization by ID (admin)",
    description: "Retrieve organization details by ID for admin.",
  })
  @ApiParam({ name: "orgId", description: "Organization ID" })
  @ApiResponseDto(GetCompanyDto)
  async getOrganization(
    @Param("orgId") orgId: string,
  ): Promise<ApiResponse<OrganizationWithDetailsDto | null>> {
    return await this.organizationUseCase.getOrganizationById(orgId);
  }

  @Patch(":orgId")
  @ApiOperation({
    summary: "Update organization (admin)",
    description: "Update organization basic info and verification status.",
  })
  @ApiParam({ name: "orgId", description: "Organization ID" })
  @ApiResponseDto(GetCompanyDto)
  async updateOrganization(
    @Param("orgId") orgId: string,
    @Body() body: AdminUpdateOrganizationUpsertDTO,
  ) {
    return await this.organizationUseCase.adminUpdateOrganization(orgId, {
      name: body.name,
      description: body.description,
      websiteUrl: body.websiteUrl,
      phone: body.phone,
      verifiedAt: body.verifiedAt,
    });
  }

  @Delete(":orgId")
  @ApiOperation({
    summary: "Delete organization (admin)",
    description: "Soft delete an organization.",
  })
  @ApiParam({ name: "orgId", description: "Organization ID" })
  async deleteOrganization(@Param("orgId") orgId: string) {
    return await this.organizationUseCase.adminDeleteOrganization(orgId);
  }
}
