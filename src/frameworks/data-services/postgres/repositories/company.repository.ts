import { Injectable, Inject } from "@nestjs/common";
import {
  Company,
  ICompanyRepository,
  NewCompany,
  OrganizationLocation,
} from "@/core";
import { companies } from "../models/company.model";
import { type DBDrizzle } from "../types";
import { GenericRepository } from "./generic-repository";
import { asc, count, gt } from "drizzle-orm";
import { isNull } from "drizzle-orm";
import { eq, and, ilike } from "drizzle-orm";
import { PaginatedResult } from "@/common/types/api";
import { CompanyFilters } from "@/core/entities/company.entity";
import {
  organizationLocations,
  organizationMembers,
  organizations,
} from "../models/organization.model";
import { OrganizationTypeEnum } from "@/core";

@Injectable()
export class CompanyRepository
  extends GenericRepository<Company, typeof companies>
  implements ICompanyRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, companies);
  }
  async checkNameExists(name: string): Promise<boolean> {
    const result = await this.db
      .select({ count: count() })
      .from(organizations)
      .where(
        and(
          eq(organizations.name, `${name}`),
          eq(organizations.type, OrganizationTypeEnum.COMPANY),
        ),
      )
      .limit(1);

    return result[0]?.count > 0;
  }

  async getCompanyByOrganizationId(
    organizationId: string,
  ): Promise<Company | null> {
    const result = await this.db
      .select()
      .from(companies)
      .innerJoin(organizations, eq(companies.organizationId, organizations.id))
      .where(
        and(
          eq(organizations.type, OrganizationTypeEnum.COMPANY),
          eq(companies.organizationId, organizationId),
        ),
      );

    if (!result[0]) return null;

    const row = result[0];
    return {
      ...row.organizations,
      organizationId: row.organizations.id,
      companySize: row.companies.companySize || null,
      taxCode: row.companies.taxCode || null,
      benefits: row.companies.benefits || null,
      companyRawId: row.companies.companyRawId || null,
      culture: row.companies.culture || null,
    };
  }

  async getCompanies(
    limit = 20,
    filter?: CompanyFilters,
    cursor?: string,
  ): Promise<
    PaginatedResult<Pick<Company, "id" | "name" | "logoUrl" | "address">>
  > {
    const whereConditions = [isNull(companies.deletedAt)];

    if (filter?.keyword) {
      whereConditions.push(ilike(organizations.name, `%${filter.keyword}%`));
    }

    if (cursor) {
      whereConditions.push(gt(organizations.id, cursor));
    }

    const companyRows = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        logoUrl: organizations.logoUrl,
        address: organizations.address,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(asc(organizations.createdAt))
      .limit(limit + 1);

    const [{ count: totalCount }] = await this.db
      .select({ count: count() })
      .from(companies)
      .leftJoin(
        organizationLocations,
        eq(organizations.id, organizationLocations.organizationId),
      )
      .where(and(...whereConditions));

    const hasNextPage = companyRows.length > limit;
    const data = hasNextPage ? companyRows.slice(0, limit) : companyRows;

    const nextCursor =
      hasNextPage && data.length > 0
        ? data[data.length - 1].createdAt.toISOString()
        : null;

    // log org ids
    // const orgIds = data.map((d) => d.id);

    return {
      data: data,
      pagination: {
        nextCursor,
        hasNextPage,
        total: totalCount,
      },
    };
  }

  async createCompany(data: NewCompany, userId: string): Promise<Company> {
    const dt = await this.db.transaction(async (tx) => {
      const [org] = await tx
        .insert(organizations)
        .values({
          name: data.name,
          slug: data.slug,
          type: data.type,
          description: data.description,
          address: data.address,
          logoUrl: data.logoUrl,
          about: data.about,
          websiteUrl: data.websiteUrl,
          email: data.email,
          phone: data.phone,
          foundedYear: data.foundedYear,
          employeesMin: data.employeesMin,
          employeesMax: data.employeesMax,
        })
        .returning();

      const locationValues = data.locations?.map((location) => ({
        organizationId: org.id,
        address: location.address ?? "",
        provinceId: location.provinceId ?? "",
      }));

      const orgLocations = await tx
        .insert(organizationLocations)
        .values(locationValues ?? [])
        .returning();

      const [company] = await tx
        .insert(companies)
        .values({
          organizationId: org.id,
          companySize: data.companySize,
          taxCode: data.taxCode,
          benefits: data.benefits,
        })
        .returning();

      await tx
        .insert(organizationMembers)
        .values({
          organizationId: org.id,
          userId: userId,
          role: "organization_owner",
        })
        .execute();

      return {
        ...company,
        ...org,
        locations: orgLocations,
      };
    });

    return dt;
  }

  async updateCompanyById(
    id: string,
    data: Partial<Company>,
  ): Promise<Company | null> {
    const dt = this.db.transaction(async (tx) => {
      const [org] = await tx
        .update(organizations)
        .set(data)
        .where(eq(organizations.id, id))
        .returning();

      const allLocations: OrganizationLocation[] = [];

      if (data.locations && data.locations.length > 0) {
        // for-each location, if it has id then update, else insert, then return all locations
        for (const loc of data.locations) {
          if (loc.id) {
            const [updatedLoc] = await tx
              .update(organizationLocations)
              .set({
                address: loc.address ?? "",
                provinceId: loc.provinceId,
              })
              .where(eq(organizationLocations.id, loc.id))
              .returning();
            if (updatedLoc) {
              allLocations.push(updatedLoc);
            } else {
              const [newLoc] = await tx
                .insert(organizationLocations)
                .values({
                  organizationId: id,
                  address: loc.address ?? "",
                  provinceId: loc.provinceId,
                })
                .returning();
              allLocations.push(newLoc);
            }
          }
        }
      }
      const [company] = await tx
        .update(companies)
        .set({
          companySize: data.companySize,
          taxCode: data.taxCode,
          benefits: data.benefits,
        })
        .where(eq(companies.organizationId, org.id))
        .returning();

      return {
        ...company,
        ...org,
        locations: allLocations,
      };
    });

    return dt;
  }
}
