import { RESPONSE_CODE } from "@/common/constants/response";
import {
  OrganizationInvitationTypeEnum,
  OrganizationInviteStatusEnum,
  OrganizationMemberInvitation,
} from "@/core";
import { IOrganizationMemberInvitationRepository } from "@/core/abstracts/repositories/organization-member-invitations-repository.abstract";
import { IOrganizationMembersRepository } from "@/core/abstracts/repositories/organization-members-repository.abstract";
import {
  ApiResponse,
  CreateOrganizationInvitationDto,
  GeneralQueryDto,
  PaginatedResultDto,
  RespondToInvitationDto,
} from "@/interfaces/dtos";
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";

@Injectable()
export class OrganizationInvitationUseCase {
  private readonly logger: Logger = new Logger(
    OrganizationInvitationUseCase.name,
  );

  constructor(
    private readonly organizationMemberInvitationRepository: IOrganizationMemberInvitationRepository,
    private readonly organizationMemberRepository: IOrganizationMembersRepository,
  ) {}

  async inviteMemberToOrganization(
    inviterId: string,
    organizationId: string,
    data: CreateOrganizationInvitationDto,
  ): Promise<ApiResponse<OrganizationMemberInvitation>> {
    // Check permissions of inviter
    const inviterInOrganization =
      await this.organizationMemberRepository.getByField({
        organizationId: organizationId,
        userId: inviterId,
      });

    if (!inviterInOrganization) {
      throw new UnauthorizedException(
        "You do not have permission to invite members to this organization.",
      );
    }

    // Check if there is already a pending invitation
    const existingInvitation =
      await this.organizationMemberInvitationRepository.getByField({
        organizationId: organizationId,
        actorId: data.inviteeId,
        receiverId: data.inviteeId,
        type: OrganizationInvitationTypeEnum.OUTGOING,
        status: OrganizationInviteStatusEnum.PENDING,
      });
    if (existingInvitation && existingInvitation.length > 0) {
      throw new BadRequestException(
        "There is already a pending invitation for this user.",
      );
    }

    // Create invitation
    const invitation = await this.organizationMemberInvitationRepository.create(
      {
        organizationId: organizationId,
        actorId: inviterId,
        receiverId: data.inviteeId,
        type: OrganizationInvitationTypeEnum.OUTGOING,
        status: OrganizationInviteStatusEnum.PENDING,
        role: data.role,
        // 1 month expiration
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      },
    );

    if (!invitation) {
      throw new BadRequestException("Failed to create invitation.");
    }

    return {
      data: invitation,
      message: "Invitation sent successfully.",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async getByOrganizationId(
    userId: string,
    organizationId: string,
    query: GeneralQueryDto,
  ): Promise<
    ApiResponse<PaginatedResultDto<OrganizationMemberInvitation | null>>
  > {
    // Check if user is a member of the organization
    const member = await this.organizationMemberRepository.getByField({
      organizationId: organizationId,
      userId: userId,
    });

    if (!member) {
      throw new UnauthorizedException(
        "You do not have permission to view invitations for this organization.",
      );
    }

    const invitations =
      await this.organizationMemberInvitationRepository.getByOrganizationId(
        organizationId,
        query,
      );

    return {
      data: {
        data: invitations.data,
        pagination: invitations.pagination,
      },
      message: "Invitations retrieved successfully.",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async respondToInvitation(
    userId: string,
    invitationId: string,
    data: RespondToInvitationDto,
  ): Promise<ApiResponse<boolean>> {
    // Get invitation
    const invitation =
      await this.organizationMemberInvitationRepository.get(invitationId);

    if (!invitation) {
      throw new BadRequestException("Invitation not found.");
    }

    // Check if the user is the receiver of the invitation
    if (invitation.receiverId !== userId) {
      throw new UnauthorizedException(
        "You do not have permission to respond to this invitation.",
      );
    }

    // Update invitation status
    invitation.status =
      data.action === "ACCEPT"
        ? OrganizationInviteStatusEnum.ACCEPTED
        : OrganizationInviteStatusEnum.DECLINED;

    const updatedInvitation =
      await this.organizationMemberInvitationRepository.update(
        {
          id: invitationId,
        },
        invitation,
      );

    if (!updatedInvitation) {
      throw new BadRequestException("Failed to update invitation status.");
    }

    return {
      data: true,
      message: "Invitation response recorded successfully.",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async getHighestRoleInvitation(
    organizationId: string,
    userId: string,
  ): Promise<ApiResponse<OrganizationMemberInvitation | null>> {
    const invitations =
      await this.organizationMemberInvitationRepository.getByField({
        organizationId,
        receiverId: userId,
        status: OrganizationInviteStatusEnum.PENDING,
      });

    if (!invitations || invitations.length === 0) {
      return {
        data: null,
        message: "No pending invitations.",
        code: RESPONSE_CODE.SUCCESS,
      };
    }

    // Define role hierarchy
    const rolePriority: Record<string, number> = {
      organization_owner: 2,
      organization_admin: 1,
    };

    // Lấy invite có role cao nhất
    const highestRoleInvite = invitations.reduce((prev, curr) => {
      return rolePriority[curr.role] > rolePriority[prev.role] ? curr : prev;
    });

    console.log("Highest role invitation:", highestRoleInvite);

    return {
      data: highestRoleInvite,
      message: "Highest role pending invitation retrieved successfully.",
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
