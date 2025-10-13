import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Query,
  Param,
} from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { CompanyUseCase } from "@/use-cases/company/company.use-case";
import {
  CreateCompanyDto,
  CompanyDto,
  CompanySimpleResponseDto,
  GetCompanyDto,
} from "@/interfaces/dtos";
import {
  ApiResponse,
  ApiResponseDto,
} from "@/interfaces/dtos/common/api-response.dto";
import { Company } from "@/core/entities";
import { GuestGuard } from "@/frameworks/auth-services/guards/guest.guard";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { type TokenPayload } from "@/common/types/token";
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

  @UseGuards(GuestGuard)
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
