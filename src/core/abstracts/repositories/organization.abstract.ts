import { UpdateOrganizationDto } from "@/interfaces/dtos";
import { IGenericRepository } from "./generic-repository.abstract";
import {
  NewOrganization,
  Organization,
  OrganizationWithDetails,
} from "@/core/entities";
import { PaginatedResult } from "@/common/types/api";
import { OrganizationQuery } from "@/core/entities/organization.entity";

export abstract class IOrganizationRepository extends IGenericRepository<Organization> {
  abstract getOrganizationById(id: string): Promise<Organization | null>;
  abstract getOrganizationWithDetails(
    id: string,
  ): Promise<OrganizationWithDetails | null>;
  abstract getOrganizations(
    query: OrganizationQuery,
  ): Promise<PaginatedResult<Organization>>;
  abstract getOrganizationsByUserId(
    userId: string,
  ): Promise<PaginatedResult<Organization>>;
  abstract createOrganization(
    userId: string,
    item: NewOrganization,
  ): Promise<Organization>;
  abstract updateOrganizationById(
    id: string,
    data: UpdateOrganizationDto,
  ): Promise<Organization | null>;
}
