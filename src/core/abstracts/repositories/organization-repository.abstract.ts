import { GeneralQuery, PaginatedResult } from "@/common/types/api";
import { IGenericRepository } from "./generic-repository.abstract";
import {
  NewOrganizationWithDetails,
  OrganizationTypeEnum,
  OrganizationWithDetails,
} from "@/core/entities";
import { OrganizationQuery } from "@/core/entities/organization.entity";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

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

  abstract getMyOrganizations(
    userId: string,
    query: GeneralQuery,
  ): Promise<
    PaginatedResult<
      Pick<
        OrganizationWithDetails,
        "id" | "name" | "logoUrl" | "description" | "foundedYear" | "verifiedAt"
      >
    >
  >;

  abstract checkNameMightExist(name: string, score: number): Promise<boolean>;

  abstract createOrganization(
    data: NewOrganizationWithDetails,
    tx?: DBDrizzleTransaction,
  ): Promise<OrganizationWithDetails>;

  abstract updateOrganizationById(
    id: string,
    data: Partial<OrganizationWithDetails>,
    tx?: DBDrizzleTransaction,
  ): Promise<OrganizationWithDetails>;

  abstract deleteOrganizationById(id: string): Promise<boolean>;

  abstract getOrganizationsByTypes(
    types: OrganizationTypeEnum[],
  ): Promise<OrganizationWithDetails[]>;

  abstract getMemberIdsOfOrganization(orgId: string): Promise<{ id: string }[]>;
}
