import { GeneralQuery, PaginatedResult } from "@/common/types";
import {
  NewOrganizationWithDetails,
  OrganizationQuery,
  OrganizationTrends,
  OrganizationTrendsQuery,
  OrganizationTypeEnum,
  OrganizationWithDetails,
} from "@/core";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";
import { IGenericRepository } from "./generic-repository.abstract";

export abstract class IOrganizationRepository extends IGenericRepository<OrganizationWithDetails> {
  abstract getOrganizationById(
    id: string,
  ): Promise<OrganizationWithDetails | null>;

  abstract getOrganizationOverviewStats(
    id: string,
  ): Promise<{ activeJobsCount: number; totalMembersCount: number }>;

  abstract getOrganizations(
    query: OrganizationQuery,
  ): Promise<
    PaginatedResult<
      Pick<
        OrganizationWithDetails,
        | "id"
        | "name"
        | "type"
        | "logoUrl"
        | "description"
        | "email"
        | "phone"
        | "foundedYear"
        | "verifiedAt"
        | "createdAt"
      >
    >
  >;

  abstract getOrganizationsByAdmin(
    query: OrganizationQuery,
  ): Promise<
    PaginatedResult<
      Pick<
        OrganizationWithDetails,
        | "id"
        | "name"
        | "type"
        | "logoUrl"
        | "description"
        | "email"
        | "phone"
        | "foundedYear"
        | "verifiedAt"
        | "createdAt"
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
      > & { role: string }
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

  abstract invalidateCache(id: string): Promise<void>;

  abstract getOrganizationsByTypes(
    types: OrganizationTypeEnum[],
  ): Promise<OrganizationWithDetails[]>;

  abstract getMemberIdsOfOrganization(orgId: string): Promise<{ id: string }[]>;

  abstract getOrganizationTrends(
    params: OrganizationTrendsQuery,
  ): Promise<OrganizationTrends[]>;

  abstract countOrganizationsByTypes(
    types: OrganizationTypeEnum[],
  ): Promise<number>;
}
