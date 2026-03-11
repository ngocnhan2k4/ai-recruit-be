import {
  JwtAuthGuard,
  OrganizationAuthorizeGuard,
} from "@/frameworks/auth-services/guards";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  ApiResponseDto,
  CheckOrganizationNameResponseDto,
  CompanyDto,
  GetCompanyDto,
  CreateOrganizationDto,
  ApiResponse,
  PaginatedResultDto,
  OrganizationWithDetailsDto,
  GeneralQueryDto,
  UpdateOrganizationEmailDto,
  ConfirmUpdateOrganizationEmailDto,
  DeleteOrganizationDto,
  UpdateOrganizationBasicInfoDto,
  UpdateOrganizationLocationDto,
  UpdateOrganizationAdditionalInfoDto,
  SendEmailVerificationDto,
  VerifyOrganizationEmailDto,
} from "../../dtos";
import { GetUser, UploadFileAndBody } from "@/common/decorators";
import { type TokenPayload } from "@/common/types";
import { OrganizationUseCase } from "@/use-cases/organization/organization.use-case";
import { OrganizationQueryDto } from "@/interfaces/dtos";
import { OrganizationWithDetails } from "@/core";
import { OptionalJwtAuthGuard } from "@/frameworks/auth-services/guards";
import { MultipartFile } from "@fastify/multipart";

@ApiTags("Organization")
@Controller("organizations")
export class OrganizationController {
  constructor(private readonly organizationUseCase: OrganizationUseCase) {}

  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @Get("/me")
  @ApiOperation({
    summary: "Get organizations by user ID with cursor pagination",
    description:
      "Retrieve a list of organizations associated with a specific user using cursor-based pagination",
  })
  @ApiResponseDto(CompanyDto, {
    isArray: true,
  })
  async getOrganizationsByOwner(
    @GetUser() user: TokenPayload,
    @Query() query: GeneralQueryDto,
  ) {
    return await this.organizationUseCase.getOrganizationsByOwner(
      user?.userId,
      query,
    );
  }

  @UseGuards(OrganizationAuthorizeGuard)
  @Get("/check-name/:name")
  @ApiOperation({
    summary: "Check if a company name exists",
    description: "Check if a company name exists",
  })
  @ApiResponseDto(CheckOrganizationNameResponseDto)
  async checkNameExists(@Param("name") name: string) {
    return await this.organizationUseCase.checkOrganizationName(name);
  }

  @UseGuards(OptionalJwtAuthGuard)
  @Get("/:orgId")
  @ApiOperation({
    summary: "Get organization by ID",
    description: "Retrieve an organization by its ID",
  })
  @ApiResponseDto(GetCompanyDto)
  async getOrganization(
    @GetUser() user: TokenPayload,
    @Param("orgId") orgId: string,
  ): Promise<ApiResponse<OrganizationWithDetailsDto | null>> {
    return await this.organizationUseCase.getOrganizationById(
      orgId,
      user?.userId,
    );
  }

  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @Post()
  @ApiOperation({
    summary: "Create a new organization",
    description: "Create a new organization",
  })
  @ApiResponseDto(String)
  async createOrganization(
    @Body() data: CreateOrganizationDto,
    @GetUser() user: TokenPayload,
  ) {
    return await this.organizationUseCase.createOrganization(
      data,
      user?.userId,
    );
  }

  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @Patch("/:orgId/basic-info")
  @ApiOperation({
    summary: "Update organization basic information",
    description:
      "Update basic information including name, description, websiteUrl, and phone. Only sends changed fields.",
  })
  @ApiResponseDto(OrganizationWithDetailsDto)
  async updateOrganizationBasicInfo(
    @Param("orgId") orgId: string,
    @Body() data: UpdateOrganizationBasicInfoDto,
  ) {
    return await this.organizationUseCase.updateOrganizationBasicInfo(
      orgId,
      data,
    );
  }

  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @Patch("/:orgId/locations")
  @ApiOperation({
    summary: "Update organization locations",
    description:
      "Replace all organization locations with new list. Frontend sends FULL list of current locations. All existing locations will be deleted and replaced with new ones.",
  })
  @ApiResponseDto(String, { isArray: true })
  async updateOrganizationLocations(
    @Param("orgId") orgId: string,
    @Body() data: UpdateOrganizationLocationDto,
  ) {
    return await this.organizationUseCase.updateOrganizationLocations(
      orgId,
      data.locations,
    );
  }

  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @Patch("/:orgId/additional-info")
  @ApiOperation({
    summary: "Update organization additional information (Culture & Benefits)",
    description:
      "Update culture and benefits information. Only for COMPANY type organizations. Only sends changed fields.",
  })
  @ApiResponseDto(OrganizationWithDetailsDto)
  async updateOrganizationAdditionalInfo(
    @GetUser() user: TokenPayload,
    @Param("orgId") orgId: string,
    @Body() data: UpdateOrganizationAdditionalInfoDto,
  ) {
    return await this.organizationUseCase.updateOrganizationAdditionalInfo(
      orgId,
      data,
    );
  }

  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @Patch("/:orgId/email")
  @ApiOperation({
    summary: "Update organization email (Request)",
    description:
      "Request to update organization email. If email is NOT verified, it will be updated immediately. If email IS verified, an OTP will be sent to the NEW email for confirmation.",
  })
  @ApiResponseDto(String)
  async updateOrganizationEmail(
    @GetUser() user: TokenPayload,
    @Param("orgId") orgId: string,
    @Body() data: UpdateOrganizationEmailDto,
  ): Promise<ApiResponse<"SUCCESS" | "REQUIRE_OTP">> {
    return await this.organizationUseCase.updateOrganizationEmail(
      orgId,
      data.email,
      user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @Post("/:orgId/email/confirm")
  @ApiOperation({
    summary: "Confirm email change with OTP",
    description:
      "Confirm organization email change using the OTP code sent to the NEW email address. This will update the email and reset verifiedAt to null.",
  })
  @ApiResponseDto(String)
  async confirmUpdateOrganizationEmail(
    @GetUser() user: TokenPayload,
    @Param("orgId") orgId: string,
    @Body() data: ConfirmUpdateOrganizationEmailDto,
  ): Promise<ApiResponse<{ email: string; verifiedAt: null }>> {
    return await this.organizationUseCase.confirmUpdateOrganizationEmail(
      orgId,
      data.otpCode,
      data.email,
      user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @Post("/:orgId/email/send-verification")
  @ApiOperation({
    summary: "Send email verification OTP",
    description:
      "Send a 6-digit OTP code to the organization's email for verification. OTP expires in 10 minutes.",
  })
  @ApiResponseDto(String)
  async sendEmailVerificationOtp(
    @Param("orgId") orgId: string,
    @Body() data: SendEmailVerificationDto,
  ): Promise<ApiResponse<{ message: string; expiryMinutes: number }>> {
    return await this.organizationUseCase.sendEmailVerificationOtp(
      orgId,
      data.email,
    );
  }

  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @Post("/:orgId/email/verify")
  @ApiOperation({
    summary: "Verify organization email with OTP",
    description:
      "Verify the organization's email using the OTP code sent via email. Sets verifiedAt timestamp upon successful verification.",
  })
  @ApiResponseDto(String)
  async verifyOrganizationEmail(
    @Param("orgId") orgId: string,
    @Body() data: VerifyOrganizationEmailDto,
  ): Promise<ApiResponse<{ verifiedAt: Date }>> {
    return await this.organizationUseCase.verifyOrganizationEmail(
      orgId,
      data.otpCode,
      data.email,
    );
  }

  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @Delete("/:orgId")
  @ApiOperation({
    summary: "Delete an organization",
    description:
      "Delete an organization. Requires confirmation by entering the exact organization name.",
  })
  @ApiResponseDto(String)
  async deleteOrganization(
    @GetUser() user: TokenPayload,
    @Param("orgId") orgId: string,
    @Body() data: DeleteOrganizationDto,
  ): Promise<ApiResponse<void>> {
    return await this.organizationUseCase.deleteOrganization(
      orgId,
      data.confirmationName,
      user.userId,
    );
  }

  @Get()
  @ApiOperation({
    summary: "Get all organizations",
    description: "Get all organizations (only basic information)",
  })
  @ApiResponseDto(String)
  async getAllOrganizations(
    @Query() query: OrganizationQueryDto,
  ): Promise<
    ApiResponse<
      PaginatedResultDto<
        Pick<
          OrganizationWithDetails,
          "id" | "name" | "description" | "logoUrl" | "foundedYear"
        >
      >
    >
  > {
    return await this.organizationUseCase.getAllOrganizations(query);
  }

  @Get(":orgId/users-to-invite")
  @ApiOperation({
    summary: "Get available users to invite to an organization",
    description:
      "Retrieve a list of users who can be invited to join a specific organization",
  })
  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  async getUsersToInvite(
    @GetUser() user: TokenPayload,
    @Param("orgId") organizationId: string,
    @Query() query: GeneralQueryDto,
  ) {
    return this.organizationUseCase.getUsersToInvite(
      organizationId,
      query,
      user.userId,
    );
  }

  @UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
  @Patch("/:orgId/logo")
  @ApiOperation({
    summary: "Update organization logo",
    description:
      "Upload a new logo for the organization. Accepts image files (JPEG, PNG, WebP). Max size: 5MB",
  })
  @ApiResponseDto(String)
  async updateOrganizationLogo(
    @Param("orgId") orgId: string,
    @UploadFileAndBody()
    uploadFile: { file: MultipartFile },
  ): Promise<ApiResponse<{ logoUrl: string }>> {
    if (!uploadFile?.file) {
      throw new Error("No file provided");
    }

    return await this.organizationUseCase.updateOrganizationLogo(
      orgId,
      uploadFile.file,
    );
  }
}
