import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import {
  INotificationRepository,
  OrganizationInvitationTypeEnum,
  OrganizationInviteStatusEnum,
  OrganizationMemberInvitation,
  OrganizationRoleEnum,
  IUserRepository,
  IOrganizationRepository,
  EmailJobType,
  IMessageQueueService,
  OrganizationInvitationEmailData,
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
import { ConfigService } from "@nestjs/config";
import { CasbinService } from "@/frameworks/auth-services/casbin/casbin.service";

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
    private readonly messageQueueService: IMessageQueueService,
    private readonly userRepository: IUserRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly configService: ConfigService,
    private readonly casbinService: CasbinService,
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
        await this.organizationMemberInvitationRepository.update(
          { id: pendingInvite.id },
          {
            role: data.role,
            updatedAt: new Date(),
          },
        );
      }

      return {
        message: RESPONSE_MESSAGE.SUCCESS,
        code: RESPONSE_CODE.SUCCESS,
      };
    }

    const organization = await this.organizationRepository.get(organizationId);

    await this.organizationMemberInvitationRepository.executeWithTransaction(
      async (tx) => {
        // Create invitation
        const invitation =
          await this.organizationMemberInvitationRepository.create(
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
            tx,
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
            templateKey: "organization_invitation",
            templateData: {
              organizationName: organization?.name ?? "organization",
            },
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
      message: RESPONSE_MESSAGE.SUCCESS,
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
      const [users, organization] = await Promise.all([
        this.userRepository.getByIds([inviteeId, inviterId], ["id"]),
        this.organizationRepository.get(organizationId),
      ]);
      const invitee = users.find((u) => u.id === inviteeId);
      const inviter = users.find((u) => u.id === inviterId);

      if (invitee?.email && inviter?.name && organization?.name) {
        const invitationLink = `${this.configService.get<string>("FRONTEND_URL")}/dashboard/organizations/${organizationId}/overview`;
        const roleMap: Partial<Record<OrganizationRoleEnum, string>> = {
          [OrganizationRoleEnum.ORGANIZATION_OWNER]: "Chủ sở hữu",
          [OrganizationRoleEnum.ORGANIZATION_ADMIN]: "Quản trị viên",
          [OrganizationRoleEnum.ORGANIZATION_VIEWER]: "Thành viên",
        };

        await this.messageQueueService.addEmail(
          EmailJobType.ORGANIZATION_INVITATION,
          {
            to: invitee.email,
            organizationName: organization.name,
            inviterName: inviter.name,
            invitationLink,
            role: roleMap[role] || role,
          } as OrganizationInvitationEmailData,
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 5000,
            },
          },
        );
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

    // Check if the user is the receiver of the invitation and invitation is still pending
    if (invitation.receiverId !== userId || invitation.status !== "pending") {
      throw new ForbiddenException({
        message: RESPONSE_MESSAGE.FORBIDDEN,
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    // Track what happened for Casbin updates after transaction
    let casbinAction: "new" | "restored" | null = null;
    let oldRole: string | null = null;

    // Update invitation status and add/restore member
    await this.organizationMemberRepository.executeWithTransaction(
      async (tx) => {
        const updatedInvitation =
          await this.organizationMemberInvitationRepository.update(
            {
              id: invitationId,
            },
            {
              status:
                data.action === "ACCEPT"
                  ? OrganizationInviteStatusEnum.ACCEPTED
                  : OrganizationInviteStatusEnum.DECLINED,
              updatedAt: new Date(),
            },
            tx,
          );

        if (!updatedInvitation) {
          throw new BadRequestException({
            message: RESPONSE_MESSAGE.UPDATE_INVITATION_FAILED,
            code: RESPONSE_CODE.UPDATE_INVITATION_FAILED,
          });
        }

        if (data.action === "ACCEPT") {
          // Check if user was previously a member (including soft-deleted)
          const existingMembers =
            await this.organizationMemberRepository.getByField({
              organizationId: invitation.organizationId,
              userId: invitation.receiverId!,
            });

          if (existingMembers && existingMembers.length > 0) {
            // Restore the soft-deleted member and update role
            const existingMember = existingMembers[0];
            const result = await this.organizationMemberRepository.update(
              { id: existingMember.id },
              {
                role: invitation.role,
                deletedAt: null,
                updatedAt: new Date(),
              },
              tx,
            );

            if (!result) {
              throw new BadRequestException({
                message: RESPONSE_MESSAGE.ADD_MEMBER_FAILED,
                code: RESPONSE_CODE.ADD_MEMBER_FAILED,
              });
            }

            casbinAction = "restored";
            oldRole = existingMember.role;
          } else {
            // Create new member if not exists
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
                message: RESPONSE_MESSAGE.ADD_MEMBER_FAILED,
                code: RESPONSE_CODE.ADD_MEMBER_FAILED,
              });
            }

            casbinAction = "new";
          }
        }
      },
    );

    // Apply Casbin changes AFTER transaction succeeds
    // Note: receiverId is guaranteed to be non-null here because we checked
    // invitation.receiverId !== userId at line 314 and userId is always a string
    if (data.action === "ACCEPT" && casbinAction) {
      if (casbinAction === "restored" && oldRole) {
        // Delete old role, add new role
        await this.casbinService.deleteRoleForUserInDomain(
          userId,
          oldRole,
          invitation.organizationId,
        );
        await this.casbinService.addRoleForUserInDomain(
          userId,
          invitation.role,
          invitation.organizationId,
        );
        await this.casbinService.savePolicy();
        this.logger.log(
          `Updated Casbin g2 role: ${userId} -> ${invitation.role} -> ${invitation.organizationId}`,
        );
      } else if (casbinAction === "new") {
        // Add new role
        await this.casbinService.addRoleForUserInDomain(
          userId,
          invitation.role,
          invitation.organizationId,
        );
        await this.casbinService.savePolicy();
        this.logger.log(
          `Added Casbin g2 role: ${userId} -> ${invitation.role} -> ${invitation.organizationId}`,
        );
      }
    }

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
        message: RESPONSE_MESSAGE.FORBIDDEN,
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    await this.organizationMemberInvitationRepository.update(
      { id: invitation.id },
      {
        role: newRole as OrganizationRoleEnum,
        updatedAt: new Date(),
      },
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
        message: RESPONSE_MESSAGE.INVITATION_NOT_PENDING,
        code: RESPONSE_CODE.INVITATION_NOT_PENDING,
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
        message: RESPONSE_MESSAGE.FORBIDDEN,
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
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async getInvitationHistory(
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

    // Get invitation history (accepted or declined)
    const invitations =
      await this.organizationMemberInvitationRepository.getInvitationHistory(
        organizationId,
        query,
      );

    return {
      data: invitations,
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
