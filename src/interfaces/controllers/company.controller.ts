import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  Param,
  Req,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { CompanyUseCase } from "@/use-cases/company/company.use-case";
import {
  CreateCompanyDto,
  CompanyDto,
  GetCompaniesQueryDto,
  GetCompanyDto,
} from "@/interfaces/dtos";
import {
  ApiResponse,
  ApiResponseDto,
} from "@/interfaces/dtos/common/api-response.dto";
import { Company } from "@/core/entities";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { type TokenPayload } from "@/common/types/token";
import { PaginatedResultDto } from "../dtos/common/query";
@ApiTags("Companies")
@Controller("companies")
export class CompanyController {
  constructor(private readonly companyUseCase: CompanyUseCase) {}

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
      PaginatedResultDto<Pick<Company, "id" | "name" | "logoUrl" | "address">>
    >
  > {
    return await this.companyUseCase.getCompanies(
      query.limit,
      {
        keyword: query.keyword,
        provinceIds: query.provinceIds,
        verified: query.verified,
        employeeRange: {
          min: query.employeeMin,
          max: query.employeeMax,
        },
      },
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

  @Get("/:companyId")
  @ApiOperation({
    summary: "Get company by ID",
    description: "Retrieve a company by its ID",
  })
  @ApiResponseDto(GetCompanyDto)
  async getCompany(
    @GetUser() user: TokenPayload,
    @Param("companyId") companyId: string,
  ): Promise<ApiResponse<GetCompanyDto>> {
    return await this.companyUseCase.getCompany(user?.userId, companyId);
  }
}
