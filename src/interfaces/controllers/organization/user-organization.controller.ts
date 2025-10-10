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
} from "../../dtos";
import { Company } from "@/core/entities";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { type TokenPayload } from "@/common/types/token";
import { GuestGuard } from "@/frameworks/auth-services/guards/guest.guard";

@ApiTags("User-Organization")
@Controller("user/:userId/org")
export class UserOrganizationController {
  constructor(private readonly companyUseCase: CompanyUseCase) {}
  @UseGuards(GuestGuard)
  @Get()
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
    @Query() query: { limit: number; cursor: string },
  ): Promise<ApiResponse<Partial<Company>[]>> {
    return await this.companyUseCase.getCompaniesByUserId(
      userId,
      query.limit,
      query.cursor,
    );
  }
}
