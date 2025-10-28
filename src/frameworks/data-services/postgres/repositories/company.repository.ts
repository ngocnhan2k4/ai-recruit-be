import { Injectable, Inject } from "@nestjs/common";
import { Company, ICompanyRepository } from "@/core";
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

  // async getCompaniesByUserId(
  //   userId: string,
  //   limit: number,
  //   cursor: string,
  // ): Promise<
  //   PaginatedResult<
  //     Pick<
  //       OrganizationWithDetails,
  //       "id" | "name" | "logoUrl" | "description" | "foundedYear"
  //     > & { role: string }
  //   >
  // > {
  //   const whereConditions = [eq(organizationMembers.userId, userId)];

  //   // Add cursor condition if provided
  //   if (cursor) {
  //     whereConditions.push(gt(companies.createdAt, new Date(cursor)));
  //   }

  //   // Fetch limit + 1 to check if there's a next page
  //   const results = await this.db
  //     .select({
  //       id: companies.organizationId,
  //       name: organizations.name,
  //       logoUrl: organizations.logoUrl,
  //       description: organizations.description,
  //       foundedYear: organizations.foundedYear,
  //       role: organizationMembers.role,
  //       createdAt: organizations.createdAt,
  //     })
  //     .from(companies)
  //     .innerJoin(
  //       organizations,
  //       eq(companies.organizationId, organizations.id),
  //     )
  //     .where(and(...whereConditions))
  //     .orderBy(desc(organizations.createdAt))
  //     .limit(limit + 1);

  //   // Check if there's a next page
  //   const hasNextPage = results.length > limit;
  //   const data = hasNextPage ? results.slice(0, limit) : results;

  //   // Get the next cursor from the last item
  //   const nextCursor =
  //     hasNextPage && data.length > 0
  //       ? data[data.length - 1].createdAt.toISOString()
  //       : null;

  //   return {
  //     data: data,
  //     pagination: {
  //       nextCursor: nextCursor,
  //       hasNextPage,
  //     },
  //   };
  // }

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
  // async updateCompanyById(
  //   organizationId: string,
  //   data: UpdateCompanyDto,
  // ): Promise<Company | null> {
  //   const result = await this.db
  //     .update(companies)
  //     .set(data)
  //     .where(and(eq(companies.organizationId, organizationId)))
  //     .returning();
  //   if (!result[0]) return null;
  //   return {
  //     ...result[0],
  //     companySize: result[0].companySize || null,
  //     taxCode: result[0].taxCode || null,
  //     benefits: result[0].benefits || null,
  //     companyRawId: result[0].companyRawId || null,
  //     culture: result[0].culture || null,
  //   };
  // }
}
