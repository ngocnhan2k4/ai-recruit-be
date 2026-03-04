import { OrganizationMember, User } from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";
import { MemberQuery } from "@/core/entities/organization-members.entity";
import { PaginatedResult } from "@/common/types";

export abstract class IOrganizationMembersRepository extends IGenericRepository<OrganizationMember> {
  abstract getAllMembers(
    orgId: string,
    query: MemberQuery,
  ): Promise<
    PaginatedResult<
      Pick<User, "id" | "name" | "avatarUrl" | "email"> & {
        role: string;
      }
    >
  >;

  abstract getMemberRole(orgId: string, userId: string): Promise<string | null>;

  abstract isActiveMember(
    organizationId: string,
    userId: string,
  ): Promise<boolean>;
}
