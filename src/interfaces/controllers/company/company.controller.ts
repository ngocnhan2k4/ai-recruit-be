import { Controller, Get, Query } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { CompanyUseCase } from "@/use-cases/company/company.use-case";
import { CompanyDto, GetCompaniesQueryDto } from "@/interfaces/dtos";
import {
  ApiResponse,
  ApiResponseDto,
} from "@/interfaces/dtos/common/api-response.dto";
import { Company } from "@/core/entities";
import { PaginatedResultDto } from "../../dtos/common/query";

@ApiTags("Companies Public")
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
      },
      query.cursor,
    );
  }
}
