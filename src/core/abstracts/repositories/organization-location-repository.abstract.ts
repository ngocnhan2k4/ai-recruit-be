import { NewOrganizationLocation, OrganizationLocation } from "@/core/entities";
import { IGenericRepository } from "./generic-repository.abstract";
import { DBDrizzleTransaction } from "@/frameworks/data-services/postgres/types";

export abstract class IOrganizationLocationRepository extends IGenericRepository<OrganizationLocation> {
  abstract createOrganizationLocations(
    data: NewOrganizationLocation[],
    tx?: DBDrizzleTransaction,
  ): Promise<OrganizationLocation[]>;

  abstract deleteLocation(id: string): Promise<boolean>;

  abstract updateLocation(
    id: string,
    data: Partial<NewOrganizationLocation>,
    tx?: DBDrizzleTransaction,
  ): Promise<OrganizationLocation>;
}
