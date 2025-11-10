import { RESPONSE_CODE } from "@/common/constants/response";
import {
  OrganizationInviteStatusEnum,
  OrganizationMemberInvitation,
  User,
} from "@/core";
import { IOrganizationMemberInvitationRepository } from "@/core/abstracts/repositories/organization-member-invitations-repository.abstract";
import { IOrganizationMembersRepository } from "@/core/abstracts/repositories/organization-members-repository.abstract";
import {
  ApiResponse,
  CreateOrganizationInvitationDto,
  GeneralQueryDto,
  PaginatedResultDto,
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
    // private readonly notificationService: INotificationService,
  ) {}

  async getUsersToInvite(
    query: GeneralQueryDto,
  ): Promise<
    ApiResponse<
      PaginatedResultDto<Pick<
        User,
        "id" | "name" | "email" | "avatarUrl" | "username"
      > | null>
    >
  > {
    const usersToInvite =
      await this.organizationMemberInvitationRepository.getUsersToInvite(query);

    return {
      data: {
        data: usersToInvite.data,
        pagination: usersToInvite.pagination,
      },
      message: "Users to invite retrieved successfully.",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async inviteMemberToOrganization(
    inviterId: string,
    data: CreateOrganizationInvitationDto,
  ): Promise<ApiResponse<OrganizationMemberInvitation>> {
    // Check permissions of inviter
    const inviterInOrganization =
      await this.organizationMemberRepository.getByField({
        organizationId: data.organizationId,
        userId: inviterId,
      });

    if (!inviterInOrganization) {
      throw new UnauthorizedException(
        "You do not have permission to invite members to this organization.",
      );
    }

    // Check if invitee is already a member
    const inviteeInOrganization =
      await this.organizationMemberRepository.getByField({
        organizationId: data.organizationId,
        userId: data.inviteeId,
      });
    if (inviteeInOrganization) {
      throw new UnauthorizedException(
        "The user is already a member of this organization.",
      );
    }

    // Check if there is already a pending invitation
    const existingInvitation =
      await this.organizationMemberInvitationRepository.getByField({
        organizationId: data.organizationId,
        inviteeId: data.inviteeId,
        status: OrganizationInviteStatusEnum.PENDING,
      });
    if (existingInvitation) {
      throw new UnauthorizedException(
        "There is already a pending invitation for this user.",
      );
    }

    // Create invitation
    const invitation = await this.organizationMemberInvitationRepository.create(
      {
        organizationId: data.organizationId,
        inviteeId: data.inviteeId,
        inviterId,
        status: OrganizationInviteStatusEnum.PENDING,
        role: data.role,
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

  async respondToInvitation(
    userId: string,
    invitationId: string,
    accept: boolean,
  ): Promise<ApiResponse<any>> {
    const invitation =
      await this.organizationMemberInvitationRepository.get(invitationId);
    if (!invitation || invitation.inviteeId !== userId) {
      throw new UnauthorizedException("Invitation not found.");
    }

    if (
      (invitation.status as OrganizationInviteStatusEnum) !==
      OrganizationInviteStatusEnum.PENDING
    ) {
      throw new BadRequestException(
        "Invitation has already been responded to.",
      );
    }

    const newStatus = accept
      ? OrganizationInviteStatusEnum.ACCEPTED
      : OrganizationInviteStatusEnum.DECLINED;
    const createdMember =
      await this.organizationMemberRepository.executeWithTransaction(
        async (tx) => {
          const result =
            await this.organizationMemberInvitationRepository.update(
              {
                id: invitationId,
              },
              {
                status: newStatus,
              },
            );

          // If accepted, mark other pending invitations as accepted
          if (accept) {
            await this.organizationMemberRepository.createMember(
              {
                organizationId: invitation.organizationId,
                userId: invitation.inviteeId!,
                role: invitation.role,
              },
              tx,
            );
            const pendingInvitations =
              await this.organizationMemberInvitationRepository.getByField({
                organizationId: invitation.organizationId,
                inviteeId: userId,
                status: OrganizationInviteStatusEnum.PENDING,
              });

            // mark other invitations as declined
            for (const pendingInvitation of pendingInvitations) {
              if (pendingInvitation.id !== invitationId) {
                await this.organizationMemberInvitationRepository.update(
                  { id: pendingInvitation.id },
                  { status: OrganizationInviteStatusEnum.ACCEPTED },
                );
              }
            }
          }
          return result;
        },
      );

    if (!createdMember) {
      throw new BadRequestException("Failed to respond to invitation.");
    }

    return {
      message: `Invitation ${accept ? "accepted" : "declined"} successfully.`,
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async getHighestRoleInvitation(
    organizationId: string,
    inviteeId: string,
  ): Promise<ApiResponse<OrganizationMemberInvitation | null>> {
    const invitations =
      await this.organizationMemberInvitationRepository.getByField({
        organizationId,
        inviteeId,
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

    return {
      data: highestRoleInvite,
      message: "Highest role pending invitation retrieved successfully.",
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
