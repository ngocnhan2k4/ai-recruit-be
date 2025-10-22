import { UpdateOrganizationDto } from "@/interfaces/dtos";
import { IGenericRepository } from "./generic-repository.abstract";
import { Organization, OrganizationWithDetails } from "@/core/entities";

export abstract class IOrganizationRepository extends IGenericRepository<Organization> {
  abstract getOrganizationById(id: string): Promise<Organization | null>;
  abstract getOrganizationWithDetails(
    id: string,
  ): Promise<OrganizationWithDetails | null>;
  abstract updateOrganizationById(
    id: string,
    data: UpdateOrganizationDto,
  ): Promise<Organization | null>;
}
