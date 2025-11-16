import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { OrganizationRoleEnum } from "@/core";
import { IOrganizationMembersRepository } from "@/core/abstracts/repositories/organization-members-repository.abstract";
import { ApiResponse, PaginatedResultDto } from "@/interfaces/dtos";
import {
  GetMemberQueryDto,
  OrganizationMemberDto,
  UpdateMemberRoleDto,
} from "@/interfaces/dtos/organization/organization-member.dto";
import { Injectable, Logger } from "@nestjs/common";

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
}
