import { OrganizationMemberInvitation, User } from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";
import { GeneralQuery, PaginatedResult } from "@/common/types";

export abstract class IOrganizationMemberInvitationRepository extends IGenericRepository<OrganizationMemberInvitation> {
  abstract getUsersToInvite(
    query: GeneralQuery,
  ): Promise<
    PaginatedResult<Pick<
      User,
      "id" | "name" | "email" | "avatarUrl" | "username"
    > | null>
  >;

  abstract getByOrganizationId(
    organizationId: string,
    query: GeneralQuery,
  ): Promise<PaginatedResult<OrganizationMemberInvitation | null>>;

  abstract getInvitationHistory(
    organizationId: string,
    query: GeneralQuery,
  ): Promise<PaginatedResult<OrganizationMemberInvitation | null>>;
}
