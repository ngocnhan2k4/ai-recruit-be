import { GetUser } from "@/common/decorators/get-user.decorator";
import type { TokenPayload } from "@/common/types/token";
import { OrganizationMemberInvitation } from "@/core";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import {
  ApiResponse,
  ApiResponseDto,
  CreateOrganizationInvitationDto,
  GeneralQueryDto,
  PaginatedResultDto,
} from "@/interfaces/dtos";
import { OrganizationInvitationUseCase } from "@/use-cases/organization-invitation/organization-intivation.use-case";
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

@UseGuards(JwtAuthGuard)
@ApiTags("Organization Invitation")
@Controller("organizations/:organizationId/invitations")
export class OrganizationInvitationController {
  constructor(
    private readonly organizationInvitationUseCase: OrganizationInvitationUseCase,
  ) {}

  @Post()
  @ApiOperation({
    summary: "Add a member to an organization",
    description: "Add a member to an organization",
  })
  @ApiResponseDto(Boolean)
  async inviteMember(
    @GetUser() user: TokenPayload,
    @Param("organizationId") organizationId: string,
    @Body() data: CreateOrganizationInvitationDto,
  ): Promise<ApiResponse<OrganizationMemberInvitation>> {
    console.log("Invite member called with data:", {
      inviterId: user.userId,
      organizationId,
      data,
    });
    return this.organizationInvitationUseCase.inviteMemberToOrganization(
      user.userId, // actorID
      organizationId, // organizationId
      data,
    );
  }

  @Get()
  @ApiOperation({
    summary: "Get invitations for an organization",
    description: "Retrieve a list of invitations for a specific organization",
  })
  @ApiResponseDto(Boolean)
  async getOrganizationInvitations(
    @GetUser() user: TokenPayload,
    @Param("organizationId") organizationId: string,
    @Query() query: GeneralQueryDto,
  ): Promise<
    ApiResponse<PaginatedResultDto<OrganizationMemberInvitation | null>>
  > {
    return this.organizationInvitationUseCase.getByOrganizationId(
      user.userId,
      organizationId,
      query,
    );
  }

  @Get("me")
  @ApiOperation({
    summary: "Get my invitations for an organization",
    description: "Retrieve my invitations for a specific organization",
  })
  @ApiResponseDto(Boolean)
  async getHighestRoleInvitation(
    @GetUser() user: TokenPayload,
    @Param("organizationId") organizationId: string,
  ): Promise<ApiResponse<OrganizationMemberInvitation | null>> {
    return await this.organizationInvitationUseCase.getHighestRoleInvitation(
      organizationId,
      user.userId,
    );
  }
}
