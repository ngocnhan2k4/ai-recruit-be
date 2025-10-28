import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  ApiResponseDto,
  CheckOrganizationNameResponseDto,
  CompanyDto,
  GetCompaniesQueryDto,
  GetCompanyDto,
  CreateOrganizationDto,
  UpdateOrganizationDto,
} from "../../dtos";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { type TokenPayload } from "@/common/types/token";
import { OrganizationUseCase } from "@/use-cases/organization/organization.use-case";

@ApiTags("Organization")
@Controller("organizations")
export class OrganizationController {
  constructor(private readonly organizationUseCase: OrganizationUseCase) {}

  @UseGuards(JwtAuthGuard)
  @Get("users/:userId")
  @ApiOperation({
    summary: "Get organizations by user ID with cursor pagination",
    description:
      "Retrieve a list of organizations associated with a specific user using cursor-based pagination",
  })
  @ApiResponseDto(CompanyDto, {
    isArray: true,
  })
  async getOrganizationsByOwner(
    @GetUser() user: TokenPayload,
    @Query() query: GetCompaniesQueryDto,
  ) {
    return await this.organizationUseCase.getOrganizationsByOwner(
      user?.userId,
      query,
    );
  }

  @Get("/check-name/:name")
  @ApiOperation({
    summary: "Check if a company name exists",
    description: "Check if a company name exists",
  })
  @ApiResponseDto(CheckOrganizationNameResponseDto)
  async checkNameExists(@Param("name") name: string) {
    return await this.organizationUseCase.checkOrganizationName(name);
  }

  // [TODO-PHAT]: check api
  @Get("/:orgId")
  @ApiOperation({
    summary: "Get organization by ID",
    description: "Retrieve an organization by its ID",
  })
  @ApiResponseDto(GetCompanyDto)
  async getOrganization(
    @GetUser() user: TokenPayload,
    @Param("orgId") orgId: string,
  ) {
    return await this.organizationUseCase.getOrganizationById(
      orgId,
      user?.userId,
    );
  }

  // [TODO-PHAT]: check api
  @Post()
  @ApiOperation({
    summary: "Create a new organization",
    description: "Create a new organization",
  })
  @ApiResponseDto(String)
  async createOrganization(@Body() data: CreateOrganizationDto) {
    return await this.organizationUseCase.createOrganization(data);
  }

  // [TODO-PHAT]: check api
  @Patch("/:orgId")
  @ApiOperation({
    summary: "Update an organization",
    description: "Update an organization",
  })
  @ApiResponseDto(String)
  async updateOrganization(
    @Param("orgId") orgId: string,
    @Body() data: UpdateOrganizationDto,
  ) {
    return await this.organizationUseCase.updateOrganization(orgId, data);
  }

  // [TODO-PHAT]: check api
  @Delete("/:orgId")
  @ApiOperation({
    summary: "Delete an organization",
    description: "Delete an organization",
  })
  @ApiResponseDto(String)
  async deleteOrganization(@Param("orgId") orgId: string) {
    return await this.organizationUseCase.deleteOrganization(orgId);
  }
}
