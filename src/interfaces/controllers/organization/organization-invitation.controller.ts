import { GetUser } from "@/common/decorators/get-user.decorator";
import type { TokenPayload } from "@/common/types/token";
import { OrganizationMemberInvitation } from "@/core";
import {
  JwtAuthGuard,
  OrganizationAuthorizeGuard,
} from "@/frameworks/auth-services/guards";
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
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@UseGuards(JwtAuthGuard, OrganizationAuthorizeGuard)
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
  ): Promise<ApiResponse<void>> {
    return await this.organizationInvitationUseCase.inviteMemberToOrganization(
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
  async getJoinInvitation(
    @GetUser() user: TokenPayload,
    @Param("organizationId") organizationId: string,
  ): Promise<ApiResponse<OrganizationMemberInvitation | null>> {
    return await this.organizationInvitationUseCase.getJoinInvitation(
      organizationId,
      user.userId,
    );
  }

  @Patch(":invitationId/role")
  @ApiOperation({
    summary: "Update invitation role",
    description: "Update the role of an organization invitation",
  })
  @ApiResponseDto(Boolean)
  async updateInivitationRole(
    @GetUser() user: TokenPayload,
    @Param("invitationId") invitationId: string,
    @Body() body: { newRole: string },
  ): Promise<ApiResponse<void>> {
    return await this.organizationInvitationUseCase.updateInvitationRole(
      user.userId,
      invitationId,
      body.newRole,
    );
  }

  @Delete(":invitationId")
  @ApiOperation({
    summary: "Revoke invitation",
    description:
      "Revoke a pending invitation. Only the inviter or organization admin/owner can revoke.",
  })
  @ApiResponseDto(Boolean)
  async revokeInvitation(
    @GetUser() user: TokenPayload,
    @Param("invitationId") invitationId: string,
  ): Promise<ApiResponse<void>> {
    return await this.organizationInvitationUseCase.revokeInvitation(
      user.userId,
      invitationId,
    );
  }
}
