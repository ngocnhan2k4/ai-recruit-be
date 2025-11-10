import { GetUser } from "@/common/decorators/get-user.decorator";
import type { TokenPayload } from "@/common/types/token";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { ApiResponseDto } from "@/interfaces/dtos";
import { OrganizationInvitationUseCase } from "@/use-cases/organization-invitation/organization-intivation.use-case";
import { Body, Controller, Param, Post, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@UseGuards(JwtAuthGuard)
@ApiTags("Organization Invitation")
@Controller("organizations/:organizationId/invitations")
export class OrganizationInvitationController {
  constructor(
    private readonly organizationMemberInvitationsUseCase: OrganizationInvitationUseCase,
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

  @Post(":invitationId/respond")
  @ApiOperation({
    summary: "Respond to an organization invitation",
    description: "Accept or decline an invitation to join an organization",
  })
  async respondToInvitation(
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
