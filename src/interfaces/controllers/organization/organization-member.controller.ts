import { GetUser } from "@/common/decorators/get-user.decorator";
import type { TokenPayload } from "@/common/types/token";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { ApiResponseDto } from "@/interfaces/dtos";
import { OrganizationMemberInvitationUseCase } from "@/use-cases/organization-member-invitation/organization-member-intivation.use-case";
import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import {
  ApiOperation,
  ApiResetContentResponse,
  ApiTags,
} from "@nestjs/swagger";

@UseGuards(JwtAuthGuard)
@ApiTags("Organization Invitations")
@Controller("organizations/:organizationId/invitations")
export class OrganizationController {
  constructor(
    private readonly organizationMemberInvitationsUseCase: OrganizationMemberInvitationUseCase,
  ) {}

  @Post("/")
  @ApiOperation({
    summary: "Add a member to an organization",
    description: "Add a member to an organization",
  })
  @ApiResponseDto(Boolean)
  async inviteMember(
    @GetUser() user: TokenPayload,
    @Param("organizationId") organizationId: string,
    @Body() body: any,
  ) {
    return this.organizationMemberInvitationsUseCase.inviteMemberToOrganization(
      user.userId,
      {
        organizationId,
        inviteeId: body.inviteeId,
        role: body.role,
      },
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiResetContentResponse({
    description: "Remove a member from an organization",
  })
  @Post(":invitationId/respond")
  @ApiOperation({
    summary: "Remove a member from an organization",
    description: "Remove a member from an organization",
  })
  @ApiResponseDto(Boolean)
  async removeMember(
    @Param("organizationId") organizationId: string,
    @Param("invitationId") invitationId: string,
    @Body() body: { accept: boolean },
  ) {
    return await this.organizationMemberInvitationsUseCase.respondToInvitation(
      organizationId,
      invitationId,
      body.accept,
    );
  }
}
