import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { OrganizationRoleEnum } from "@/core";
import { IOrganizationMembersRepository } from "@/core/abstracts/repositories/organization-members-repository.abstract";
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

@Injectable()
export class OrganizationMemberUseCase {
  private readonly logger: Logger = new Logger(OrganizationMemberUseCase.name);

  constructor(
    private readonly organizationMemberRepository: IOrganizationMembersRepository,
  ) {}

  async getMembersByOrganizationId(
    organizationId: string,
    query: GetMemberQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<OrganizationMemberDto>>> {
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

  async deleteMember(orgId: string, userId: string) {
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

    await this.organizationMemberRepository.delete({
      organizationId: orgId,
      userId: kickedMemberId,
    });

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async updateMemberRole(organizationId: string, data: UpdateMemberRoleDto) {
    return await this.organizationMemberRepository.update(
      {
        organizationId,
        userId: data.userId,
      },
      {
        role: data.role,
      },
    );
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
