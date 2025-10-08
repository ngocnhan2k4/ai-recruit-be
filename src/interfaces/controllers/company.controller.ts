import { Controller, Get, Post, Body, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { CompanyUseCase } from "@/use-cases/company/company.use-case";
import {
  CreateCompanyDto,
  CompanyDto,
  CompanySimpleResponseDto,
} from "@/interfaces/dtos";
import {
  ApiResponse,
  ApiResponseDto,
} from "@/interfaces/dtos/common/api-response.dto";
import { Company } from "@/core/entities";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { GuestGuard } from "@/frameworks/auth-services/guards/guest.guard";
@ApiTags("Companies")
@Controller("companies")
export class CompanyController {
  constructor(private readonly companyUseCase: CompanyUseCase) {}

  @Get("/all/simple")
  @ApiOperation({
    summary: "Get all companies",
    description: "Get a simple list of all companies with id and name",
  })
  @ApiResponseDto(CompanySimpleResponseDto, { isArray: true })
  @UseGuards(GuestGuard)
  async getSimpleCompanies(): Promise<ApiResponse<CompanySimpleResponseDto[]>> {
    return await this.companyUseCase.getSimpleCompanies();
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
