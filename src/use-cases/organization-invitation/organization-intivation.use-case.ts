import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import {
  INotificationRepository,
  OrganizationInvitationTypeEnum,
  OrganizationInviteStatusEnum,
  OrganizationMemberInvitation,
  OrganizationRoleEnum,
  IUserRepository,
  IOrganizationRepository,
  EmailJobType,
} from "@/core";
import { INotificationService } from "@/core/abstracts/notification.abstract";
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
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { IEmailQueueStorageService } from "@/core";
import { randomUUID } from "crypto";

@Injectable()
export class OrganizationInvitationUseCase {
  private readonly logger: Logger = new Logger(
    OrganizationInvitationUseCase.name,
  );

  constructor(
    private readonly organizationMemberInvitationRepository: IOrganizationMemberInvitationRepository,
    private readonly organizationMemberRepository: IOrganizationMembersRepository,
    private readonly notificationService: INotificationService,
    private readonly notificationRepository: INotificationRepository,
    private readonly emailQueueStorage: IEmailQueueStorageService,
    private readonly userRepository: IUserRepository,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  /**
   * Check if inviter has permission to invite a user with the target role.
   * Rules:
   * - Members (EDITOR/EMPLOYEE/etc) cannot invite anyone
   * - Admin can only invite Viewer
   * - Owner can invite Owner, Admin, or Viewer
   */
  private canInviteRole(
    inviterRole: string,
    targetRole: OrganizationRoleEnum,
  ): boolean {
    const inviterRoleEnum = inviterRole as OrganizationRoleEnum;
    // Owner can invite Owner, Admin, or Viewer
    if (inviterRoleEnum === OrganizationRoleEnum.ORGANIZATION_OWNER) {
      return [
        OrganizationRoleEnum.ORGANIZATION_OWNER,
        OrganizationRoleEnum.ORGANIZATION_ADMIN,
        OrganizationRoleEnum.ORGANIZATION_VIEWER,
      ].includes(targetRole);
    }

    // Admin can only invite Viewer
    if (inviterRoleEnum === OrganizationRoleEnum.ORGANIZATION_ADMIN) {
      return targetRole === OrganizationRoleEnum.ORGANIZATION_VIEWER;
    }

    // All other roles (members) cannot invite
    return false;
  }

  async inviteMemberToOrganization(
    inviterId: string,
    organizationId: string,
    data: CreateOrganizationInvitationDto,
  ): Promise<ApiResponse<void>> {
    // Check permissions of inviter
    const inviterInOrganization =
      await this.organizationMemberRepository.getByField({
        organizationId: organizationId,
        userId: inviterId,
        deletedAt: null,
      });

    if (!inviterInOrganization || inviterInOrganization.length === 0) {
      throw new ForbiddenException({
        message: RESPONSE_MESSAGE.FORBIDDEN,
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    const inviterRole = inviterInOrganization[0].role;

    // Check if inviter has permission to invite the target role
    if (!this.canInviteRole(inviterRole, data.role)) {
      throw new ForbiddenException({
        message: RESPONSE_MESSAGE.FORBIDDEN,
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    // Check if invitee is already an active member using isNull for deletedAt
    const isAlreadyMember =
      await this.organizationMemberRepository.isActiveMember(
        organizationId,
        data.inviteeId,
      );

    if (isAlreadyMember) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.INVITEE_ALREADY_MEMBER,
        code: RESPONSE_CODE.INVITEE_ALREADY_MEMBER,
      });
    }

    // Check if there is already a pending invitation
    const existingInvitation =
      await this.organizationMemberInvitationRepository.getByField({
        organizationId: organizationId,
        receiverId: data.inviteeId,
        type: OrganizationInvitationTypeEnum.OUTGOING,
        status: OrganizationInviteStatusEnum.PENDING,
        deletedAt: null,
      });
    if (existingInvitation && existingInvitation.length > 0) {
      // Update role if different
      const pendingInvite = existingInvitation[0];
      if ((pendingInvite.role as OrganizationRoleEnum) !== data.role) {
        pendingInvite.role = data.role;
        await this.organizationMemberInvitationRepository.update(
          { id: pendingInvite.id },
          pendingInvite,
        );
      }

      return {
        message: RESPONSE_MESSAGE.SUCCESS,
        code: RESPONSE_CODE.SUCCESS,
      };
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
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.SENT_INVITATION_FAILED,
        code: RESPONSE_CODE.SENT_INVITATION_FAILED,
      });
    }

    await this.notificationService.createAndSendToUser(
      {
        title: "Organization Invitation",
        senderId: inviterId,
        message: `You have been invited to join an organization.`,
        payload: {
          orgId: organizationId,
          userId: data.inviteeId,
          orgInvitationId: invitation.id,
        },
        type: "organization_invitation",
      },
      {
        userId: data.inviteeId,
      },
    );

    // Fire-and-forget: Queue email asynchronously without blocking response
    void this.sentEmailInvitation(
      data.inviteeId,
      inviterId,
      organizationId,
      data.role,
    );

    return {
      message: "Invitation sent successfully.",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async sentEmailInvitation(
    inviteeId: string,
    inviterId: string,
    organizationId: string,
    role: OrganizationRoleEnum,
  ): Promise<void> {
    // Queue email invitation (non-blocking)
    try {
      const [invitee, inviter, organization] = await Promise.all([
        this.userRepository.get(inviteeId),
        this.userRepository.get(inviterId),
        this.organizationRepository.get(organizationId),
      ]);

      if (invitee?.email && inviter?.name && organization?.name) {
        const invitationLink = `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard/organizations/${organizationId}/overview`;
        const roleMap: Partial<Record<OrganizationRoleEnum, string>> = {
          [OrganizationRoleEnum.ORGANIZATION_OWNER]: "Chủ sở hữu",
          [OrganizationRoleEnum.ORGANIZATION_ADMIN]: "Quản trị viên",
          [OrganizationRoleEnum.ORGANIZATION_VIEWER]: "Thành viên",
        };

        this.emailQueueStorage.addToQueue({
          id: randomUUID(),
          type: EmailJobType.ORGANIZATION_INVITATION,
          data: {
            to: invitee.email,
            organizationName: organization.name,
            inviterName: inviter.name,
            invitationLink,
            role: roleMap[role] || role,
          },
          attempts: 0,
          maxAttempts: 3,
          createdAt: new Date(),
        });
      }
    } catch (error) {
      this.logger.error("Failed to queue invitation email", error);
    }
  }

  async getByOrganizationId(
    userId: string,
    organizationId: string,
    query: GeneralQueryDto,
  ): Promise<
    ApiResponse<
      PaginatedResultDto<
        | (OrganizationMemberInvitation & {
            inviterName?: string | null;
            inviteeName?: string | null;
            inviteeAvatarUrl?: string | null;
          })
        | null
      >
    >
  > {
    // Check if user is a member of the organization
    const [member] = await this.organizationMemberRepository.getByField({
      organizationId: organizationId,
      userId: userId,
    });

    if (!member) {
      throw new ForbiddenException({
        message: RESPONSE_MESSAGE.FORBIDDEN,
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    // Repository already enriches data with user info via joins
    const invitations =
      await this.organizationMemberInvitationRepository.getByOrganizationId(
        organizationId,
        query,
      );

    return {
      data: invitations,
      message: RESPONSE_MESSAGE.SUCCESS,
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
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.INVITATION_NOT_FOUND,
        code: RESPONSE_CODE.INVITATION_NOT_FOUND,
      });
    }

    // Check if the user is the receiver of the invitation
    if (invitation.receiverId !== userId) {
      throw new ForbiddenException({
        message: RESPONSE_MESSAGE.FORBIDDEN,
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    // Update invitation status
    invitation.status =
      data.action === "ACCEPT"
        ? OrganizationInviteStatusEnum.ACCEPTED
        : OrganizationInviteStatusEnum.DECLINED;

    await this.organizationMemberRepository.executeWithTransaction(
      async (tx) => {
        const updatedInvitation =
          await this.organizationMemberInvitationRepository.update(
            {
              id: invitationId,
            },
            invitation,
            tx,
          );

        if (!updatedInvitation) {
          throw new BadRequestException({
            message: RESPONSE_MESSAGE.SERVER_ERROR,
            code: RESPONSE_CODE.SERVER_ERROR,
          });
        }

        if (data.action === "ACCEPT") {
          // Add member to organization
          const result = await this.organizationMemberRepository.create(
            {
              organizationId: invitation.organizationId,
              userId: invitation.receiverId!,
              role: invitation.role,
            },
            tx,
          );
          if (!result) {
            throw new BadRequestException({
              message: RESPONSE_MESSAGE.SERVER_ERROR,
              code: RESPONSE_CODE.SERVER_ERROR,
            });
          }
        }

        await this.notificationRepository.deleteInviationNotifications(
          invitation.organizationId,
          invitation.receiverId!,
          tx,
        );
      },
    );

    return {
      data: true,
      message: RESPONSE_CODE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async getJoinInvitation(
    organizationId: string,
    userId: string,
  ): Promise<ApiResponse<OrganizationMemberInvitation | null>> {
    const invitation =
      await this.organizationMemberInvitationRepository.getByField({
        organizationId: organizationId,
        receiverId: userId,
        type: OrganizationInvitationTypeEnum.OUTGOING,
        status: OrganizationInviteStatusEnum.PENDING,
        deletedAt: null,
      });
    return {
      data: invitation && invitation.length > 0 ? invitation[0] : null,
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async checkUserInvitationExists(
    organizationId: string,
    inviteeId: string,
  ): Promise<boolean> {
    const existingInvitation =
      await this.organizationMemberInvitationRepository.getByField({
        organizationId: organizationId,
        receiverId: inviteeId,
        type: OrganizationInvitationTypeEnum.OUTGOING,
        status: OrganizationInviteStatusEnum.PENDING,
      });
    return !!(existingInvitation && existingInvitation.length > 0);
  }

  async updateInvitationRole(
    userId: string,
    invitationId: string,
    newRole: string,
  ): Promise<ApiResponse<void>> {
    const invitation =
      await this.organizationMemberInvitationRepository.get(invitationId);
    if (!invitation) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.INVITATION_NOT_FOUND,
        code: RESPONSE_CODE.INVITATION_NOT_FOUND,
      });
    }

    // Use canInviteRole to check if userId has permission to update the role
    const inviterInOrganization =
      await this.organizationMemberRepository.getByField({
        organizationId: invitation.organizationId,
        userId: userId,
        deletedAt: null,
      });
    console.log({ inviterInOrganization });

    if (!inviterInOrganization || inviterInOrganization.length === 0) {
      throw new ForbiddenException({
        message: RESPONSE_MESSAGE.FORBIDDEN,
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    const inviterRole = inviterInOrganization[0].role;

    // Check if inviter has permission to invite the target role
    if (!this.canInviteRole(inviterRole, newRole as OrganizationRoleEnum)) {
      throw new ForbiddenException({
        message: "You do not have permission to assign this role.",
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    invitation.role = newRole as OrganizationRoleEnum;
    await this.organizationMemberInvitationRepository.update(
      { id: invitation.id },
      invitation,
    );

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async revokeInvitation(
    userId: string,
    invitationId: string,
  ): Promise<ApiResponse<void>> {
    // Get invitation
    const invitation =
      await this.organizationMemberInvitationRepository.get(invitationId);

    if (!invitation) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.INVITATION_NOT_FOUND,
        code: RESPONSE_CODE.INVITATION_NOT_FOUND,
      });
    }

    // Check if invitation is still pending
    if (
      (invitation.status as OrganizationInviteStatusEnum) !==
      OrganizationInviteStatusEnum.PENDING
    ) {
      throw new BadRequestException({
        message: "Cannot revoke invitation that is not pending.",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    // Check permission: only the inviter (actor) or organization admin/owner can revoke
    const userInOrganization =
      await this.organizationMemberRepository.getByField({
        organizationId: invitation.organizationId,
        userId: userId,
      });

    if (!userInOrganization || userInOrganization.length === 0) {
      throw new ForbiddenException({
        message: RESPONSE_MESSAGE.FORBIDDEN,
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    const userRole = userInOrganization[0].role as OrganizationRoleEnum;
    const isInviter = invitation.actorId === userId;
    const isAdminOrOwner =
      userRole === OrganizationRoleEnum.ORGANIZATION_OWNER ||
      userRole === OrganizationRoleEnum.ORGANIZATION_ADMIN;

    if (!isInviter && !isAdminOrOwner) {
      throw new ForbiddenException({
        message:
          "You do not have permission to revoke this invitation. Only the inviter or organization admin/owner can revoke.",
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    // Soft delete invitation and delete related notification in transaction
    await this.organizationMemberRepository.executeWithTransaction(
      async (tx) => {
        // Soft delete invitation
        await this.organizationMemberInvitationRepository.update(
          { id: invitationId },
          { deletedAt: new Date() },
          tx,
        );

        // Delete related notification
        if (invitation.receiverId) {
          await this.notificationRepository.deleteInviationNotifications(
            invitation.organizationId,
            invitation.receiverId,
            tx,
          );
        }
      },
    );

    return {
      message: "Invitation revoked successfully.",
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
