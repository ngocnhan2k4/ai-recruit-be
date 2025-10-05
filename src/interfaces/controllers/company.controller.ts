import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { ApiResponseDto, ApiResponse, CompanySimpleDto } from "../dtos";
import { CompanyUseCases } from "@/use-cases/company/company.use-case";
import { GuestGuard } from "@/frameworks/auth-services/guards/guest.guard";

@ApiTags("Companies")
@Controller("companies")
export class CompanyController {
  constructor(private readonly companyUseCases: CompanyUseCases) {}

  @ApiOperation({
    summary: "Get all companies",
    description: "Get a simple list of all companies with id and name",
  })
  @ApiResponseDto(CompanySimpleDto, { isArray: true })
  @UseGuards(GuestGuard)
  @Get()
  async getCompanies(): Promise<ApiResponse<CompanySimpleDto[]>> {
    return this.companyUseCases.getCompanies();
  }
}
