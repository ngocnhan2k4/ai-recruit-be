import {
  NewOrganizationMember,
  OrganizationMember,
  User,
} from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";
import { MemberQuery } from "@/core/entities/organization-members.entity";
import { PaginatedResult } from "@/common/types/api";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

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

  abstract createMember(
    data: NewOrganizationMember,
    tx?: DBDrizzleTransaction,
  ): Promise<OrganizationMember>;

  abstract deleteMember(
    orgId: string,
    userId: string,
    tx?: DBDrizzleTransaction,
  ): Promise<boolean>;
}
