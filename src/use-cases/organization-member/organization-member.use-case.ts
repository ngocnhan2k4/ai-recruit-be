import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { OrganizationRoleEnum } from "@/core";
import { IOrganizationMembersRepository } from "@/core/abstracts/repositories/organization-members-repository.abstract";
import { CasbinService } from "@/frameworks/auth-services/casbin/casbin.service";
import { ApiResponse, PaginatedResultDto } from "@/interfaces/dtos";
import {
  GetMemberQueryDto,
  OrganizationMemberDto,
  UpdateMemberRoleDto,
} from "@/interfaces/dtos";
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { CasbinService } from "@/frameworks/auth-services/casbin/casbin.service";

@Injectable()
export class OrganizationMemberUseCase {
  private readonly logger: Logger = new Logger(OrganizationMemberUseCase.name);

  constructor(
    private readonly organizationMemberRepository: IOrganizationMembersRepository,
    private readonly casbinService: CasbinService,
    private readonly casbinService: CasbinService,
  ) {}

  async getMembersByOrganizationId(
    organizationId: string,
    query: GetMemberQueryDto,
    actorId?: string,
  ): Promise<ApiResponse<PaginatedResultDto<OrganizationMemberDto>>> {
    // If actorId provided, ensure the actor is a member of the organization
    if (actorId) {
      const actor = (
        await this.organizationMemberRepository.getByField({
          organizationId,
          userId: actorId,
        })
      )[0];

      if (!actor) {
        throw new ForbiddenException({
          message: RESPONSE_MESSAGE.FORBIDDEN,
          code: RESPONSE_CODE.FORBIDDEN,
        });
      }
    }

    const result = await this.organizationMemberRepository.getAllMembers(
      organizationId,
      query,
    );
    return {
      data: {
        data: result.data.map((member) => ({
          ...member,
          role: member.role as OrganizationRoleEnum,
        })),
        pagination: result.pagination,
      },
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async createMember(orgId: string, userId: string, role: string) {
    return await this.organizationMemberRepository.create({
      organizationId: orgId,
      userId,
      role: role as any,
    });
  }

  async deleteMember(orgId: string, userId: string, actorId: string) {
    // Get actor's role
    const actor = (
      await this.organizationMemberRepository.getByField({
        organizationId: orgId,
        userId: actorId,
      })
    )[0];

    if (!actor) {
      throw new ForbiddenException({
        message: RESPONSE_MESSAGE.FORBIDDEN,
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    // Only owner or admin can delete members
    if (
      (actor.role as OrganizationRoleEnum) !==
        OrganizationRoleEnum.ORGANIZATION_OWNER &&
      (actor.role as OrganizationRoleEnum) !==
        OrganizationRoleEnum.ORGANIZATION_ADMIN
    ) {
      throw new ForbiddenException({
        message: RESPONSE_MESSAGE.FORBIDDEN,
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    // Check target member exists
    const targetMember = (
      await this.organizationMemberRepository.getByField({
        organizationId: orgId,
        userId: userId,
      })
    )[0];

    if (!targetMember) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.MEMBER_NOT_FOUND,
        code: RESPONSE_CODE.MEMBER_NOT_FOUND,
      });
    }

    // Cannot delete member with higher or equal role
    if (
      this.compareRoles(
        actor.role as OrganizationRoleEnum,
        targetMember.role as OrganizationRoleEnum,
      ) <= 0
    ) {
      throw new ForbiddenException({
        message: RESPONSE_MESSAGE.FORBIDDEN,
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    // Cannot delete yourself
    if (actorId === userId) {
      throw new BadRequestException({
        message: "You cannot delete yourself from the organization",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    // Remove Casbin g2 role
    await this.casbinService.deleteRoleForUserInDomain(
      userId,
      targetMember.role,
      orgId,
    );
    await this.casbinService.savePolicy();
    this.logger.log(
      `Removed Casbin g2 role: ${userId} -> ${targetMember.role} -> ${orgId}`,
    );

    return await this.organizationMemberRepository.delete({
      organizationId: orgId,
      userId,
    });
  }

  async kickMember(
    orgId: string,
    actorId: string,
    kickedMemberId: string,
  ): Promise<ApiResponse<void>> {
    const actor = (
      await this.organizationMemberRepository.getByField({
        organizationId: orgId,
        userId: actorId,
      })
    )[0];

    if (!actor) {
      throw new ForbiddenException({
        message: RESPONSE_MESSAGE.FORBIDDEN,
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    const kickedMember = (
      await this.organizationMemberRepository.getByField({
        organizationId: orgId,
        userId: kickedMemberId,
      })
    )[0];

    if (!kickedMember) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.MEMBER_NOT_FOUND,
        code: RESPONSE_CODE.MEMBER_NOT_FOUND,
      });
    }

    if (
      this.compareRoles(
        actor.role as OrganizationRoleEnum,
        kickedMember.role as OrganizationRoleEnum,
      ) <= 0
    ) {
      throw new ForbiddenException({
        message: RESPONSE_MESSAGE.FORBIDDEN,
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    // Remove Casbin g2 role
    await this.casbinService.deleteRoleForUserInDomain(
      kickedMemberId,
      kickedMember.role,
      orgId,
    );
    await this.casbinService.savePolicy();
    this.logger.log(
      `Removed Casbin g2 role: ${kickedMemberId} -> ${kickedMember.role} -> ${orgId}`,
    );

    await this.organizationMemberRepository.delete({
      organizationId: orgId,
      userId: kickedMemberId,
    });

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async updateMemberRole(
    actorUserId: string,
    organizationId: string,
    data: UpdateMemberRoleDto,
  ): Promise<ApiResponse<any>> {
    // Check if actor has permission to change roles
    const actorMember = await this.organizationMemberRepository.getByField({
      organizationId,
      userId: actorUserId,
      deletedAt: null,
    });

    if (!actorMember || actorMember.length === 0) {
      throw new ForbiddenException({
        message: RESPONSE_MESSAGE.FORBIDDEN,
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    const actorRole = actorMember[0].role as OrganizationRoleEnum;

    // Check if target user is a member
    const targetMember = await this.organizationMemberRepository.getByField({
      organizationId,
      userId: data.userId,
      deletedAt: null,
    });

    if (!targetMember || targetMember.length === 0) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.MEMBER_NOT_FOUND,
        code: RESPONSE_CODE.MEMBER_NOT_FOUND,
      });
    }

    const targetCurrentRole = targetMember[0].role as OrganizationRoleEnum;

    // Permission check: Only Owner and Admin can change roles
    if (
      actorRole !== OrganizationRoleEnum.ORGANIZATION_OWNER &&
      actorRole !== OrganizationRoleEnum.ORGANIZATION_ADMIN
    ) {
      throw new ForbiddenException({
        message: RESPONSE_MESSAGE.FORBIDDEN,
        code: RESPONSE_CODE.FORBIDDEN,
      });
    }

    // Admin cannot change Owner's role or promote to Owner
    if (actorRole === OrganizationRoleEnum.ORGANIZATION_ADMIN) {
      if (
        targetCurrentRole === OrganizationRoleEnum.ORGANIZATION_OWNER ||
        data.role === OrganizationRoleEnum.ORGANIZATION_OWNER
      ) {
        throw new ForbiddenException({
          message: RESPONSE_MESSAGE.FORBIDDEN,
          code: RESPONSE_CODE.FORBIDDEN,
        });
      }
    }

    // Cannot change your own role
    if (actorUserId === data.userId) {
      throw new BadRequestException({
        message: "Cannot change your own role",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    const updated = await this.organizationMemberRepository.update(
      {
        organizationId,
        userId: data.userId,
      },
      {
        role: data.role,
        updatedAt: new Date(),
      },
    );

    // Update Casbin g2 role
    await this.casbinService.deleteRoleForUserInDomain(
      data.userId,
      targetCurrentRole,
      organizationId,
    );
    await this.casbinService.addRoleForUserInDomain(
      data.userId,
      data.role,
      organizationId,
    );
    await this.casbinService.savePolicy();
    this.logger.log(
      `Updated Casbin g2 role: ${data.userId} -> ${data.role} -> ${organizationId}`,
    );

    return {
      data: updated,
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  compareRoles(
    role1: OrganizationRoleEnum,
    role2: OrganizationRoleEnum,
  ): number {
    const roleHierarchy = {
      [OrganizationRoleEnum.ORGANIZATION_OWNER]: 3,
      [OrganizationRoleEnum.ORGANIZATION_ADMIN]: 2,
      [OrganizationRoleEnum.ORGANIZATION_VIEWER]: 1,
      [OrganizationRoleEnum.ANONYMOUSLY]: 0,
    };

    const rank1 = roleHierarchy[role1] || 0;
    const rank2 = roleHierarchy[role2] || 0;

    return rank1 - rank2;
  }
}
