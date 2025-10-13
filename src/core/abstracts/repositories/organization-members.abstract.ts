import { OrganizationMember } from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";
import { OrganizationRole } from "@/common/constants/organization-roles";
import { PaginatedResult } from "@/common/types/api";

export interface MemberFilter {
  keyword?: string;
  role?: OrganizationRole;
}

export abstract class IOrganizationMembersRepository extends IGenericRepository<OrganizationMember> {
  abstract getMembersByOrganizationId(
    organizationId: string,
    cursor: string,
    limit: number,
    filter?: MemberFilter,
  ): Promise<PaginatedResult<OrganizationMember>>;

  abstract countMembersByOrganizationId(
    organizationId: string,
    filter?: MemberFilter,
  ): Promise<number>;

  abstract findMemberByUserIdAndOrganizationId(
    userId: string,
    organizationId: string,
  ): Promise<OrganizationMember | null>;

  abstract removeMember(userId: string, organizationId: string): Promise<void>;

  abstract updateMemberRole(
    userId: string,
    organizationId: string,
    newRole: OrganizationRole,
  ): Promise<OrganizationMember>;
}
