import { Injectable, Inject } from "@nestjs/common";
import { ICompanyRepository, Company, NewCompany } from "@/core";
import { companies, organizationMembers } from "../models/company.model";
import { type DBDrizzle } from "../types";
import { GenericRepository } from "./generic-repository";
import { PaginatedResult } from "@/common/types/api";
import { asc, or, SQL } from "drizzle-orm";
import { orderBy } from "lodash";
import { eq, and, gt, desc, Or, is, not, ilike } from "drizzle-orm";
import {
  CompanyDto,
  CompanyWithOrganizationResponseDto,
  UpdateCompanyDto,
} from "@/interfaces/dtos";
import { organizations } from "../models/organization.model";
import { OrganizationWithDetails } from "@/core/entities";
import { OrganizationTypeEnum } from "../models/enums";

@Injectable()
export class CompanyRepository
  extends GenericRepository<Company, typeof companies>
  implements ICompanyRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, companies);
  }

  async getCompanyByOrganizationId(
    organizationId: string,
    companyId: string,
  ): Promise<OrganizationWithDetails | null> {
    const result = await this.db
      .select()
      .from(companies)
      .innerJoin(organizations, eq(companies.organizationId, organizations.id))
      .where(
        and(
          eq(companies.organizationId, organizationId),
          eq(companies.id, companyId),
          eq(organizations.type, OrganizationTypeEnum.COMPANY),
        ),
      );

    if (!result[0]) return null;

    const row = result[0];
    return {
      ...row.organizations,
      companySize: row.companies?.companySize || null,
      taxCode: row.companies?.taxCode || null,
      benefits: row.companies?.benefits || null,
      companyRawId: row.companies?.companyRawId || null,
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
  async getAllCompanies(): Promise<
    Pick<OrganizationWithDetails, "id" | "name" | "logoUrl" | "address">[]
  > {
    const result = this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        logoUrl: organizations.logoUrl,
        address: organizations.address,
      })
      .from(organizations)
      .where(eq(organizations.type, OrganizationTypeEnum.COMPANY))
      .orderBy(asc(organizations.createdAt));

    return result;
  }

  async getCompanies(
    limit = 20,
    keyword?: string,
    cursor?: string,
  ): Promise<
    PaginatedResult<
      Pick<OrganizationWithDetails, "id" | "name" | "logoUrl" | "address">
    >
  > {
    // Build where conditions
    const whereConditions: SQL[] = [];

    if (keyword) {
      whereConditions.push(ilike(organizations.name, `%${keyword}%`));
    }

    if (cursor) {
      whereConditions.push(gt(organizations.id, cursor));
    }

    const query = this.db
      .select({
        id: companies.id,
        name: organizations.name,
        logoUrl: organizations.logoUrl,
        address: organizations.address,
      })
      .from(organizations)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(asc(organizations.createdAt))
      .limit(limit + 1);

    const rows = await query;
    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    return {
      data,
      pagination: {
        nextCursor: data.length > 0 ? data[data.length - 1].id : null,
        hasNextPage,
      },
    };
  }
  async updateCompanyById(
    organizationId: string,
    companyId: string,
    data: UpdateCompanyDto,
  ): Promise<Company | null> {
    const result = await this.db
      .update(companies)
      .set(data)
      .where(
        and(
          eq(companies.organizationId, organizationId),
          eq(companies.id, companyId),
        ),
      )
      .returning();
    return result[0] || null;
  }
}
