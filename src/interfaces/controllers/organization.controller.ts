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
  CreateOrganizationDto,
  OrganizationDto,
} from "../dtos";
import { Company } from "@/core/entities";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { type TokenPayload } from "@/common/types/token";
import { GeneralQueryDto } from "../dtos/common/query";

@ApiTags("My-Organization")
@Controller("organizations")
export class MyOrganizationController {
  constructor(private readonly companyUseCase: CompanyUseCase) {}

  // @UseGuards(JwtAuthGuard)
  // @Post()
  // @ApiOperation({
  //   summary: "Create a new company",
  //   description: "Create a new company",
  // })
  // @ApiResponseDto(CompanyDto)
  // async createCompany(
  //   @GetUser() user: TokenPayload,
  //   @Body() data: CreateCompanyDto,
  // ): Promise<ApiResponse<Company>> {
  //   return await this.companyUseCase.createCompany(user.userId, data);
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
