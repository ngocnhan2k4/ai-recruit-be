import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Req,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  ApiResponse,
  ApiResponseDto,
  GetCompaniesQueryDto,
  CreateOrganizationDto,
  OrganizationDto,
  OrganizationWithDetailsDto,
} from "../../dtos";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { type TokenPayload } from "@/common/types/token";
import { PaginatedResultDto } from "../../dtos/common/query";
import { OrganizationUseCase } from "@/use-cases/organization/organization.use-case";

@ApiTags("Organization")
@Controller("organizations")
export class OrganizationController {
  constructor(private readonly organizationUseCase: OrganizationUseCase) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({
    summary: "Create a new organization",
    description: "Create a new organization",
  })
  @ApiResponseDto(OrganizationDto)
  async createOrganization(
    @GetUser() user: TokenPayload,
    @Body() data: CreateOrganizationDto,
  ): Promise<ApiResponse<OrganizationDto>> {
    return await this.organizationUseCase.createOrganization(user.userId, data);
  }

  @Get(":organizationId")
  @ApiOperation({
    summary: "Get organization by ID with details",
    description: "Retrieve an organization by its ID with detailed information",
  })
  @ApiResponseDto(OrganizationWithDetailsDto)
  async getOrganizationById(
    @Param("organizationId") organizationId: string,
  ): Promise<ApiResponse<OrganizationWithDetailsDto>> {
    return await this.organizationUseCase.getOrganizationWithDetails(
      organizationId,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get("users/:userId")
  @ApiOperation({
    summary: "Get organizations by user ID",
    description:
      "Retrieve a list of organizations associated with a specific user",
  })
  @ApiResponseDto(OrganizationDto, {
    isArray: true,
  })
  async getOrganizationsByUserId(
    @Param("userId") userId: string,
  ): Promise<ApiResponse<PaginatedResultDto<OrganizationDto>>> {
    return await this.organizationUseCase.getOrganizationsByUserId(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Get("users")
  @ApiOperation({
    summary: "Get organizations by user ID",
    description:
      "Retrieve a list of organizations associated with a specific user",
  })
  @ApiResponseDto(OrganizationDto, {
    isArray: true,
  })
  async getOrganizationsByOwner(
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<PaginatedResultDto<OrganizationDto>>> {
    return await this.organizationUseCase.getOrganizationsByUserId(user.userId);
  }

  @Get()
  @ApiOperation({
    summary: "Get organizations with cursor pagination",
    description:
      "Retrieve a list of organizations with cursor-based pagination",
  })
  @ApiResponseDto(OrganizationDto, {
    isArray: true,
  })
  async getOrganizations(
    @Query() query: GetCompaniesQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<OrganizationDto>>> {
    return await this.organizationUseCase.getOrganizations(query);
  }
}
