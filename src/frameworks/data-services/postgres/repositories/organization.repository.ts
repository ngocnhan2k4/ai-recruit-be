import { Injectable, Inject } from "@nestjs/common";
import {
  IOrganizationRepository,
  OrganizationWithDetails,
  SchoolTypeEnum,
} from "@/core";
import {
  organizationMembers,
  organizations,
} from "../models/organization.model";
import { companies } from "../models/company.model";
import { schools } from "../models/school.model";
import { type DBDrizzle } from "../types";
import { GenericRepository } from "./generic-repository";
import { eq, desc, and, gt, SQL } from "drizzle-orm";
import { PaginatedResult } from "@/common/types/api";
import { GeneralQuery } from "@/common/types/api";

@Injectable()
export class OrganizationRepository
  extends GenericRepository<OrganizationWithDetails, typeof organizations>
  implements IOrganizationRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, organizations);
  }

  async getOrganizationById(
    id: string,
  ): Promise<OrganizationWithDetails | null> {
    const result = await this.db
      .select({
        // Organization fields
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        type: organizations.type,
        description: organizations.description,
        address: organizations.address,
        logoUrl: organizations.logoUrl,
        about: organizations.about,
        websiteUrl: organizations.websiteUrl,
        email: organizations.email,
        phone: organizations.phone,
        foundedYear: organizations.foundedYear,
        verifiedAt: organizations.verifiedAt,
        employeesMin: organizations.employeesMin,
        employeesMax: organizations.employeesMax,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        deletedAt: organizations.deletedAt,
        // Company fields (nullable)
        companySize: companies.companySize,
        taxCode: companies.taxCode,
        benefits: companies.benefits,
        companyRawId: companies.companyRawId,
        culture: companies.culture,
        // School fields (nullable)
        schoolType: schools.schoolType,
      })
      .from(organizations)
      .leftJoin(companies, eq(organizations.id, companies.organizationId))
      .leftJoin(schools, eq(organizations.id, schools.organizationId))
      .where(eq(organizations.id, id));

    if (!result[0]) return null;

    const row = result[0];
    return {
      ...row,
      companySize: row.companySize,
      taxCode: row.taxCode,
      benefits: row.benefits,
      culture: row.culture,
      schoolType: row.schoolType as SchoolTypeEnum,
    };
  }

  async getAllOrganizations(
    query: GeneralQuery,
  ): Promise<
    PaginatedResult<
      Pick<
        OrganizationWithDetails,
        "id" | "name" | "logoUrl" | "description" | "foundedYear"
      >
    >
  > {
    const whereConditions: SQL<unknown>[] = [];

    if (query.cursor) {
      whereConditions.push(gt(organizations.createdAt, new Date(query.cursor)));
    }

    const results = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        logoUrl: organizations.logoUrl,
        description: organizations.description,
        foundedYear: organizations.foundedYear,
        role: organizationMembers.role,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .where(and(...whereConditions))
      .orderBy(desc(organizations.createdAt))
      .limit(query.limit + 1);

    const hasNextPage = results.length > query.limit;
    const data = hasNextPage ? results.slice(0, query.limit) : results;

    const nextCursor =
      hasNextPage && data.length > 0
        ? data[data.length - 1].createdAt.toISOString()
        : null;

    return {
      data: data,
      pagination: {
        nextCursor: nextCursor,
        hasNextPage,
      },
    };
  }

  async getMemberIdsOfOrganization(orgId: string): Promise<{ id: string }[]> {
    const results = await this.db
      .select({
        id: organizationMembers.userId,
      })
      .from(organizationMembers)
      .innerJoin(
        organizations,
        eq(organizationMembers.organizationId, organizations.id),
      )
      .where(eq(organizationMembers.organizationId, orgId));
    return results;
  }
}
