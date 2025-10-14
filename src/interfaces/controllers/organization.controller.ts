import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
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
} from "../dtos";
import { Company } from "@/core/entities";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { type TokenPayload } from "@/common/types/token";
import { GeneralQueryDto } from "../dtos/common/query";

@ApiTags("My-Organization")
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
    @Query() query: { limit: number; cursor: string },
  ): Promise<ApiResponse<Partial<Company>[]>> {
    return await this.companyUseCase.getCompaniesByUserId(
      user.userId,
      query.limit,
      query.cursor,
    );
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
    @Query() query: GeneralQueryDto,
  ): Promise<ApiResponse<Partial<Company>[]>> {
    return await this.companyUseCase.getCompaniesByUserId(
      userId,
      query.limit,
      query.cursor || "",
    );
  }
}
