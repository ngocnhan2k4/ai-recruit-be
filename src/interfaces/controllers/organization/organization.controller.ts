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
  GetCompanyDto,
  CreateOrganizationDto,
  UpdateOrganizationDto,
  ApiResponse,
  PaginatedResultDto,
  OrganizationWithDetailsDto,
  GeneralQueryDto,
} from "../../dtos";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { type TokenPayload } from "@/common/types/token";
import { OrganizationUseCase } from "@/use-cases/organization/organization.use-case";
import { OrganizationQueryDto } from "@/interfaces/dtos/organization/organization-query.dto";
import { OrganizationWithDetails } from "@/core";
import { OptionalJwtAuthGuard } from "@/frameworks/auth-services/guards/optional-jwt-auth.guard";

@ApiTags("Organization")
@Controller("organizations")
export class OrganizationController {
  constructor(private readonly organizationUseCase: OrganizationUseCase) {}

  @UseGuards(JwtAuthGuard)
  @Get("/me")
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
    @Query() query: GeneralQueryDto,
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
  @UseGuards(OptionalJwtAuthGuard)
  @Get("/:orgId")
  @ApiOperation({
    summary: "Get organization by ID",
    description: "Retrieve an organization by its ID",
  })
  @ApiResponseDto(GetCompanyDto)
  async getOrganization(
    @GetUser() user: TokenPayload,
    @Param("orgId") orgId: string,
  ): Promise<ApiResponse<OrganizationWithDetailsDto | null>> {
    return await this.organizationUseCase.getOrganizationById(
      orgId,
      user?.userId,
    );
  }

  // [TODO-PHAT]: check api
  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({
    summary: "Create a new organization",
    description: "Create a new organization",
  })
  @ApiResponseDto(String)
  async createOrganization(
    @Body() data: CreateOrganizationDto,
    @GetUser() user: TokenPayload,
  ) {
    return await this.organizationUseCase.createOrganization(
      data,
      user?.userId,
    );
  }

  // [TODO-PHAT]: check api
  @UseGuards(JwtAuthGuard)
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

  @Get("/all")
  @ApiOperation({
    summary: "Get all organizations",
    description: "Get all organizations (only basic information)",
  })
  @ApiResponseDto(String)
  async getAllOrganizations(
    @Query() query: OrganizationQueryDto,
  ): Promise<
    ApiResponse<
      PaginatedResultDto<
        Pick<
          OrganizationWithDetails,
          "id" | "name" | "description" | "logoUrl" | "foundedYear"
        >
      >
    >
  > {
    return await this.organizationUseCase.getAllOrganizations(query);
  }
}
