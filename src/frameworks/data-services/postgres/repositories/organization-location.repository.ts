import { NewOrganizationLocation, OrganizationLocation } from "@/core";
import { GenericRepository } from "./generic-repository";
import { organizationLocations } from "../models";
import { IOrganizationLocationRepository } from "@/core/abstracts/repositories/organization-location-repository.abstract";
import { DBDrizzleTransaction, type DBDrizzle } from "../types";
import { eq } from "drizzle-orm";
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

  async deleteLocation(id: string): Promise<boolean> {
    const result = await this.db
      .update(organizationLocations)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(organizationLocations.id, id))
      .returning();
    return result.length > 0;
  }

  async updateLocation(
    id: string,
    data: Partial<NewOrganizationLocation>,
    tx?: DBDrizzleTransaction,
  ): Promise<OrganizationLocation> {
    const dbClient = tx ?? this.db;
    return await dbClient
      .update(organizationLocations)
      .set(data)
      .where(eq(organizationLocations.id, id))
      .returning()
      .then((res) => res[0]);
  }
}
