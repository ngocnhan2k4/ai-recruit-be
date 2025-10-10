import { Injectable, Inject } from "@nestjs/common";
import { ICompanyRepository, Company, NewCompany } from "@/core";
import { companies, organizationMembers } from "../models/company.model";
import { type DBDrizzle } from "../types";
import { GenericRepository } from "./generic-repository";
import { PaginatedResult } from "@/common/types/api";
import { eq, and, gt, desc } from "drizzle-orm";

@Injectable()
export class CompanyRepository
  extends GenericRepository<Company, typeof companies>
  implements ICompanyRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, companies);
  }

  async getCompaniesByUserId(
    userId: string,
    limit: number,
    cursor: string,
  ): Promise<
    PaginatedResult<Pick<Company, "id" | "name" | "logoUrl" | "description">>
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
      })
      .from(companies)
      .innerJoin(
        organizationMembers,
        eq(companies.id, organizationMembers.organizationId),
      )
      .where(and(...whereConditions))
      .orderBy(desc(companies.createdAt))
      .limit(limit + 1);

    // Check if there's a next page
    const hasNextPage = results.length > limit;
    const data = hasNextPage ? results.slice(0, limit) : results;

    // Get the next cursor from the last item
    const nextCursor =
      hasNextPage && data.length > 0
        ? data[data.length - 1].createdAt.toISOString()
        : null;

    return {
      data: data.map(({ createdAt, ...company }) => company),
      pagination: {
        cursor: nextCursor,
        hasNextPage,
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
}
