import { CasbinGuard, JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { CompanyUseCase } from "@/use-cases/company/company.use-case";
import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  ApiResponse,
  ApiResponseDto,
  CompanyDto,
  CreateCompanyDto,
  GetCompaniesQueryDto,
  GetCompanyDto,
} from "../dtos";
import { Company } from "@/core/entities";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { type TokenPayload } from "@/common/types/token";
import { PaginatedResult } from "@/common/types/api";

@ApiTags("Organization")
@Controller("organizations")
export class MyOrganizationController {
  constructor(private readonly companyUseCase: CompanyUseCase) {}

  @UseGuards(JwtAuthGuard)
  @Get("/me")
  @ApiOperation({
    summary: "Get auth user's organizations",
    description:
      "Retrieve a list of organizations associated with a specific user using cursor-based pagination",
  })
  @ApiResponseDto(CompanyDto, {
    isArray: true,
  })
  async getCompaniesByOwner(
    @GetUser() user: TokenPayload,
    @Query() query: GetCompaniesQueryDto,
  ): Promise<ApiResponse<PaginatedResult<Partial<Company>>>> {
    return await this.companyUseCase.getCompaniesByUserId(user.userId, query);
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({
    summary: "Create a new company",
    description: "Create a new company",
  })
  @ApiResponseDto(CompanyDto)
  async createCompany(
    @GetUser() user: TokenPayload,
    @Body() data: CreateCompanyDto,
  ): Promise<ApiResponse<Company>> {
    return await this.companyUseCase.createCompany(user.userId, data);
  }

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
  async getCompaniesByUserId(
    @Param("userId") userId: string,
    @Query() query: GetCompaniesQueryDto,
  ): Promise<ApiResponse<PaginatedResult<Partial<Company>>>> {
    return await this.companyUseCase.getCompaniesByUserId(userId, query);
  }

  @Get()
  @ApiOperation({
    summary: "Get companies with cursor pagination",
    description: "Retrieve a list of companies with cursor-based pagination",
  })
  @ApiResponseDto(CompanyDto, {
    isArray: true,
  })
  async getPaginationCompanies(
    @Query() query: GetCompaniesQueryDto,
  ): Promise<
    ApiResponse<
      PaginatedResult<Pick<Company, "id" | "name" | "logoUrl" | "address">>
    >
  > {
    return await this.companyUseCase.getCompanies(
      query.limit,
      query.keyword,
      query.cursor,
    );
  }

  @Get("/searchByName")
  @ApiOperation({
    summary: "Search companies by name with cursor pagination",
    description: "Search for companies by name using cursor-based pagination",
  })
  @ApiResponseDto(CompanyDto, {
    isArray: true,
  })
  async getCompaniesByName(
    @Query() query: GetCompaniesQueryDto,
  ): Promise<
    ApiResponse<
      PaginatedResult<Pick<Company, "id" | "name" | "logoUrl" | "address">>
    >
  > {
    return await this.companyUseCase.getCompaniesByName(
      query.limit,
      query.keyword,
      query.cursor,
    );
  }

  @Get("/all")
  @ApiOperation({
    summary: "Get companies with cursor pagination",
    description: "Retrieve a list of companies with cursor-based pagination",
  })
  @ApiResponseDto(CompanyDto, {
    isArray: true,
  })
  async getCompanies(): Promise<
    ApiResponse<Pick<Company, "id" | "name" | "logoUrl" | "address">[]>
  > {
    return await this.companyUseCase.getAllCompanies();
  }

  @Get("/:orgId")
  @ApiOperation({
    summary: "Get organization by ID",
    description: "Retrieve an organization by its ID",
  })
  @ApiResponseDto(GetCompanyDto)
  async getOrganization(
    @GetUser() user: TokenPayload,
    @Param("orgId") orgId: string,
  ): Promise<ApiResponse<GetCompanyDto>> {
    return await this.companyUseCase.getCompany(user?.userId, orgId);
  }
}
