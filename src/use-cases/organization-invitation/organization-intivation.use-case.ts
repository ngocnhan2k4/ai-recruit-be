import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import {
  OrganizationInvitationTypeEnum,
  OrganizationInviteStatusEnum,
  OrganizationMemberInvitation,
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

@Injectable()
export class OrganizationInvitationUseCase {
  private readonly logger: Logger = new Logger(
    OrganizationInvitationUseCase.name,
  );

  constructor(
    private readonly organizationMemberInvitationRepository: IOrganizationMemberInvitationRepository,
    private readonly organizationMemberRepository: IOrganizationMembersRepository,
    private readonly notificationService: INotificationService,
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
      throw new ForbiddenException({
        message: RESPONSE_MESSAGE.FORBIDDEN,
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    const inviteeInOrganization =
      await this.organizationMemberRepository.getByField({
        organizationId: organizationId,
        userId: data.inviteeId,
      });

    if (inviteeInOrganization && inviteeInOrganization.length > 0) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.INVITEE_ALREADY_MEMBER,
        code: RESPONSE_CODE.INVITEE_ALREADY_MEMBER,
      });
    }

    // Check if there is already a pending invitation
    const existingInvitation =
      await this.organizationMemberInvitationRepository.getByField({
        organizationId: organizationId,
        actorId: inviterId,
        receiverId: data.inviteeId,
        type: OrganizationInvitationTypeEnum.OUTGOING,
        status: OrganizationInviteStatusEnum.PENDING,
      });
    if (existingInvitation && existingInvitation.length > 0) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.INVITATION_ALREADY_SENT,
        code: RESPONSE_CODE.INVITATION_ALREADY_SENT,
      });
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
        },
        type: "organization_invitation",
      },
      {
        userId: data.inviteeId,
      },
    );

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
      throw new ForbiddenException({
        message: RESPONSE_MESSAGE.FORBIDDEN,
        code: RESPONSE_CODE.FORBIDDEN,
      });
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

    console.log("Invitation found:", invitation);

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
      },
    );

    return {
      data: true,
      message: RESPONSE_CODE.SUCCESS,
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
        message: RESPONSE_MESSAGE.INVITATION_NOT_FOUND,
        code: RESPONSE_CODE.INVITATION_NOT_FOUND,
      };
    }

    // Define role hierarchy
    const rolePriority: Record<string, number> = {
      organization_owner: 3,
      organization_admin: 2,
      organization_viewer: 1,
    };

    // Lấy invite có role cao nhất
    const highestRoleInvite = invitations.reduce((prev, curr) => {
      return rolePriority[curr.role] > rolePriority[prev.role] ? curr : prev;
    });

    // console.log("Highest role invitation:", highestRoleInvite);

    return {
      data: highestRoleInvite,
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
