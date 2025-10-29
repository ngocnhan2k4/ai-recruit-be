import { PaginatedResult } from "@/common/types/api";
import { IGenericRepository } from "./generic-repository.abstract";
import { OrganizationWithDetails } from "@/core/entities";
import { OrganizationQuery } from "@/core/entities/organization.entity";

export abstract class IOrganizationRepository extends IGenericRepository<OrganizationWithDetails> {
  abstract getOrganizationById(
    id: string,
  ): Promise<OrganizationWithDetails | null>;

  abstract getAllOrganizations(
    query: OrganizationQuery,
  ): Promise<
    PaginatedResult<
      Pick<
        OrganizationWithDetails,
        "id" | "name" | "logoUrl" | "description" | "foundedYear" | "verifiedAt"
      >
    >
  >;

  abstract createOrganization(
    data: Partial<OrganizationWithDetails>,
    userId: string,
  ): Promise<OrganizationWithDetails>;

  abstract updateOrganizationById(
    id: string,
    data: Partial<OrganizationWithDetails>,
  ): Promise<OrganizationWithDetails>;

  abstract deleteOrganizationById(id: string): Promise<boolean>;
}
