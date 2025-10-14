import { Controller, Get, Post, Body, UseGuards, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { CompanyUseCase } from "@/use-cases/company/company.use-case";
import {
  CreateCompanyDto,
  CompanyDto,
  GetCompaniesQueryDto,
} from "@/interfaces/dtos";
import {
  ApiResponse,
  ApiResponseDto,
} from "@/interfaces/dtos/common/api-response.dto";
import { Company } from "@/core/entities";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { GuestGuard } from "@/frameworks/auth-services/guards/guest.guard";
import { PaginatedResult } from "@/common/types/api";
@ApiTags("Companies")
@Controller("companies")
export class CompanyController {
  constructor(private readonly companyUseCase: CompanyUseCase) {}

  @UseGuards(GuestGuard)
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

  @UseGuards(GuestGuard)
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

  @UseGuards(JwtAuthGuard)
  @Post()
  @ApiOperation({
    summary: "Create a new company",
    description: "Create a new company with the provided name",
  })
  @ApiResponseDto(CompanyDto)
  async createCompany(
    @Body() data: CreateCompanyDto,
  ): Promise<ApiResponse<Company>> {
    return await this.companyUseCase.createCompany(data);
  }
}
