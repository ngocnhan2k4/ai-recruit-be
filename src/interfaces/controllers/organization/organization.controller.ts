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
} from "../../dtos";
import { Organization, OrganizationWithDetails } from "@/core/entities";
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
  ): Promise<ApiResponse<Organization>> {
    return await this.organizationUseCase.createOrganization(user.userId, data);
  }

  @Get(":organizationId")
  @ApiOperation({
    summary: "Get organization by ID with details",
    description: "Retrieve an organization by its ID with detailed information",
  })
  @ApiResponseDto(OrganizationDto)
  async getOrganizationById(
    @Param("organizationId") organizationId: string,
  ): Promise<ApiResponse<OrganizationWithDetails>> {
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
    @GetUser() user: TokenPayload,
    @Param("userId") userId: string,
  ): Promise<ApiResponse<PaginatedResultDto<Organization>>> {
    return await this.organizationUseCase.getOrganizationsByUserId(
      userId || user.userId,
    );
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
  ): Promise<ApiResponse<PaginatedResultDto<Organization>>> {
    return await this.organizationUseCase.getOrganizations(query);
  }

  // @UseGuards(JwtAuthGuard)
  // @Get("users/:userId")
  // @ApiOperation({
  //   summary: "Get organizations by user ID with cursor pagination",
  //   description:
  //     "Retrieve a list of organizations associated with a specific user using cursor-based pagination",
  // })
  // @ApiResponseDto(CompanyDto, {
  //   isArray: true,
  // })
  // async getCompaniesByUserId(@GetUser() user: TokenPayload,
  //   @Param("userId") userId: string,
  //   @Query() query: GeneralQueryDto,
  // ): Promise<ApiResponse<Partial<Company>[]>> {
  //   let _userId = userId;
  //   if (!userId) {
  //     _userId = user.userId;
  //   }
  //   return await this.companyUseCase.getCompaniesByUserId(
  //     _userId,
  //     query.limit,
  //     query.cursor || "",
  //   );
  // }

  // @UseGuards(JwtAuthGuard)
  // @Get("users/:userId")
  // @ApiOperation({
  //   summary: "Get organizations by user ID with cursor pagination",
  //   description:
  //     "Retrieve a list of organizations associated with a specific user using cursor-based pagination",
  // })
  // @ApiResponseDto(CompanyDto, {
  //   isArray: true,
  // })
  // async getCompaniesByUserId(
  //   @Param("userId") userId: string,
  //   @Query() query: GetCompaniesQueryDto,
  // ): Promise<ApiResponse<PaginatedResultDto<Partial<Company>>>> {
  //   return await this.companyUseCase.getCompaniesByUserId(userId, query);
  // }

  // @Get()
  // @ApiOperation({
  //   summary: "Get companies with cursor pagination",
  //   description: "Retrieve a list of companies with cursor-based pagination",
  // })
  // @ApiResponseDto(CompanyDto, {
  //   isArray: true,
  // })
  // async getPaginationCompanies(
  //   // @Req() req: Request,
  //   @Query() query: GetCompaniesQueryDto,
  // ): Promise<
  //   ApiResponse<
  //     PaginatedResult<Pick<Company, "id" | "name" | "logoUrl" | "address">>
  //   >
  // > {
  //   return await this.companyUseCase.getCompanies(
  //     query.limit,
  //     {
  //       keyword: query.keyword,
  //       provinceIds: query.provinceIds,
  //       verified: query.verified,
  //       employeeRange: {
  //         min: query.employeeMin,
  //         max: query.employeeMax,
  //       },
  //     },
  //     query.cursor,
  //   );
  // }

  // @Get("/check-name/:name")
  // @ApiOperation({
  //   summary: "Check if a company name exists",
  //   description: "Check if a company name exists",
  // })
  // @ApiResponseDto(CheckOrganizationNameResponseDto)
  // async checkNameExists(
  //   @Param("name") name: string,
  // ): Promise<ApiResponse<CheckOrganizationNameResponseDto>> {
  //   return await this.companyUseCase.checkOrganizationName(name);
  // }

  // @Get("/all")
  // @ApiOperation({
  //   summary: "Get companies with cursor pagination",
  //   description: "Retrieve a list of companies with cursor-based pagination",
  // })
  // @ApiResponseDto(CompanyDto, {
  //   isArray: true,
  // })
  // async getCompanies(): Promise<
  //   ApiResponse<Pick<Company, "id" | "name" | "logoUrl" | "address">[]>
  // > {
  //   return await this.companyUseCase.getAllCompanies();
  // }

  // @Get("/:orgId")
  // @ApiOperation({
  //   summary: "Get organization by ID",
  //   description: "Retrieve an organization by its ID",
  // })
  // @ApiResponseDto(GetCompanyDto)
  // async getOrganization(
  //   @GetUser() user: TokenPayload,
  //   @Param("orgId") orgId: string,
  // ): Promise<ApiResponse<GetCompanyDto>> {
  //   return await this.companyUseCase.getCompany(user?.userId, orgId);
  // }
  // @Post("")
  // @ApiOperation({
  //   summary: "Create a new organization",
  //   description: "Create a new organization",
  // })
  // @ApiResponseDto(String)
  // async createOrganization(
  //   @Body() data: CreateOrganizationDto,
  // ): Promise<ApiResponse<Organization>> {
  //   return await this.companyUseCase.createOrganization(data);
  // }
}
