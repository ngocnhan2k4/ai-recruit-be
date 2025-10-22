import { Injectable, Inject } from "@nestjs/common";
import { Company, ICompanyRepository } from "@/core";
import {
  companies,
  organizationLocations,
  organizationMembers,
} from "../models/company.model";
import { type DBDrizzle } from "../types";
import { GenericRepository } from "./generic-repository";
import { asc, SQL, count, or, isNotNull, inArray, is } from "drizzle-orm";
import { isNull } from "drizzle-orm";
import { eq, and, lt, desc, ilike } from "drizzle-orm";
import { PaginatedResult } from "@/common/types/api";
import { CompanyFilters } from "@/core/entities/company.entity";

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
      .from(companies)
      .where(eq(companies.name, `${name}`))
      .limit(1);

    return result[0]?.count > 0;
  }

  async get(id: string | number): Promise<Company | null> {
    const companyRow = await super.get(id);
    if (!companyRow) {
      return null;
    }
    const locations = await this.db
      .select()
      .from(organizationLocations)
      .where(eq(organizationLocations.organizationId, companyRow.id));
    return {
      ...companyRow,
      locations: locations.map((loc) => ({
        address: loc.address,
        provinceId: loc.provinceId ?? undefined,
      })),
    };
  }

  async create(item: Partial<Company>): Promise<Company> {
    const { locations, ...companyData } = item;
    const insertedCompany = await super.create(companyData);
    if (locations && locations.length) {
      const invalid = locations.find((l) => !l.address);
      if (invalid) {
        throw new Error("Location address is required");
      }
      await this.db.insert(organizationLocations).values(
        locations.map((loc) => ({
          organizationId: insertedCompany.id,
          address: loc.address!,
          provinceId: loc.provinceId || null,
        })),
      );
    }
    return insertedCompany;
  }

  async getCompaniesByUserId(
    userId: string,
    limit: number,
    cursor: string,
  ): Promise<
    PaginatedResult<
      Pick<
        Company,
        "id" | "name" | "logoUrl" | "description" | "createdAt" | "foundingYear"
      > & { role: string }
    >
  > {
    const whereConditions = [eq(organizationMembers.userId, userId)];

    // Add cursor condition if provided
    if (cursor) {
      // we're ordering by createdAt DESC, so to get the next page (older items)
      // we must fetch rows with createdAt < cursor
      whereConditions.push(lt(companies.createdAt, new Date(cursor)));
    }

    // Fetch limit + 1 to check if there's a next page
    const results = await this.db
      .select({
        id: companies.id,
        name: companies.name,
        logoUrl: companies.logoUrl,
        description: companies.description,
        createdAt: companies.createdAt,
        foundingYear: companies.foundingYear,
        role: organizationMembers.role,
      })
      .from(companies)
      .innerJoin(
        organizationMembers,
        eq(companies.id, organizationMembers.organizationId),
      )
      .where(and(...whereConditions))
      .orderBy(desc(companies.createdAt))
      .limit(limit + 1);

    const [{ count: totalCount }] = await this.db
      .select({ count: count() })
      .from(companies)
      .innerJoin(
        organizationMembers,
        eq(companies.id, organizationMembers.organizationId),
      )
      .where(and(...whereConditions));

    // Check if there's a next page
    const hasNextPage = results.length > limit;
    const data = hasNextPage ? results.slice(0, limit) : results;

    // Get the next cursor from the last item
    const nextCursor =
      hasNextPage && data.length > 0
        ? data[data.length - 1].createdAt.toISOString()
        : null;

    return {
      data: data,
      pagination: {
        nextCursor: nextCursor,
        hasNextPage,
        total: totalCount,
      },
    };
  }
  async getAllSimple(): Promise<{ id: string; name: string }[]> {
    const result = await this.db
      .select({
        id: companies.id,
        name: companies.name,
      })
      .from(companies);

    return result;
  }
  async getAllCompanies(): Promise<
    Pick<Company, "id" | "name" | "logoUrl" | "address" | "locations">[]
  > {
    const result = this.db
      .select({
        id: companies.id,
        name: companies.name,
        logoUrl: companies.logoUrl,
        address: companies.address,
      })
      .from(companies);

    return result;
  }

  async getCompanies(
    limit = 20,
    filter?: CompanyFilters,
    cursor?: string,
  ): Promise<
    PaginatedResult<
      Pick<
        Company,
        | "id"
        | "name"
        | "logoUrl"
        | "address"
        | "locations"
        | "verifiedAt"
        | "createdAt"
      >
    >
  > {
    const whereConditions = [isNull(companies.deletedAt)];

    if (filter?.keyword) {
      whereConditions.push(ilike(companies.name, `%${filter.keyword}%`));
    }

    if (filter?.verified === true) {
      whereConditions.push(isNotNull(companies.verifiedAt));
    } else if (filter?.verified === false) {
      whereConditions.push(isNull(companies.verifiedAt));
    }

    if (filter?.provinceIds?.length) {
      whereConditions.push(
        inArray(organizationLocations.provinceId, filter.provinceIds),
      );
    }

    if (cursor) {
      // ordering desc -> fetch items older than the cursor
      whereConditions.push(lt(companies.createdAt, new Date(cursor)));
    }

    const companyRows = await this.db
      .select({
        id: companies.id,
        name: companies.name,
        logoUrl: companies.logoUrl,
        address: companies.address,
        createdAt: companies.createdAt,
        verifiedAt: companies.verifiedAt,
      })
      .from(companies)
      .leftJoin(
        organizationLocations,
        eq(companies.id, organizationLocations.organizationId),
      )
      .where(and(...whereConditions))
      .orderBy(desc(companies.createdAt))
      .limit(limit + 1);

    const [{ count: totalCount }] = await this.db
      .select({ count: count() })
      .from(companies)
      .leftJoin(
        organizationLocations,
        eq(companies.id, organizationLocations.organizationId),
      )
      .where(and(...whereConditions));

    const hasNextPage = companyRows.length > limit;
    const data = hasNextPage ? companyRows.slice(0, limit) : companyRows;

    const nextCursor =
      hasNextPage && data.length > 0
        ? data[data.length - 1].createdAt.toISOString()
        : null;

    // log org ids
    const orgIds = data.map((d) => d.id);

    return {
      data: data,
      pagination: {
        nextCursor,
        hasNextPage,
        total: totalCount,
      },
    };
  }
}
