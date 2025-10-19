import { Injectable, Inject } from "@nestjs/common";
import { ICompanyRepository, Company, NewCompany } from "@/core";
import { companies, organizationMembers } from "../models/company.model";
import { type DBDrizzle } from "../types";
import { GenericRepository } from "./generic-repository";
import { asc, SQL, count } from "drizzle-orm";
import { eq, and, gt, desc, ilike } from "drizzle-orm";
import { PaginatedResult } from "@/common/types/api";

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
      .where(eq(companies.name, name))
      .limit(1);

    return result[0]?.count > 0;
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
      whereConditions.push(gt(companies.createdAt, new Date(cursor)));
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
    Pick<Company, "id" | "name" | "logoUrl" | "address">[]
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
    keyword?: string,
    cursor?: string,
  ): Promise<
    PaginatedResult<Pick<Company, "id" | "name" | "logoUrl" | "address">>
  > {
    // Build where conditions
    const whereConditions: SQL[] = [];

    if (keyword) {
      whereConditions.push(ilike(companies.name, `%${keyword}%`));
    }

    if (cursor) {
      whereConditions.push(gt(companies.id, cursor));
    }

    const query = this.db
      .select({
        id: companies.id,
        name: companies.name,
        logoUrl: companies.logoUrl,
        address: companies.address,
      })
      .from(companies)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(asc(companies.id))
      .limit(limit + 1);

    const [{ count: totalCount }] = await this.db
      .select({ count: count() })
      .from(companies)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    const rows = await query;
    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    return {
      data,
      pagination: {
        nextCursor: data.length > 0 ? data[data.length - 1].id : null,
        hasNextPage,
        total: totalCount,
      },
    };
  }
}
