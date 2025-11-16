import { NewOrganizationLocation, OrganizationLocation } from "@/core";
import { GenericRepository } from "./generic-repository";
import { organizationLocations } from "../models";
import { IOrganizationLocationRepository } from "@/core/abstracts/repositories/organization-location-repository.abstract";
import { DBDrizzleTransaction, type DBDrizzle } from "../types";
import { Inject, Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationLocationRepository
  extends GenericRepository<OrganizationLocation, typeof organizationLocations>
  implements IOrganizationLocationRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, organizationLocations);
  }

  createOrganizationLocations(
    data: NewOrganizationLocation[],
    tx?: DBDrizzleTransaction,
  ): Promise<OrganizationLocation[]> {
    const dbClient = tx ?? this.db;
    return dbClient.insert(organizationLocations).values(data).returning();
  }
}
