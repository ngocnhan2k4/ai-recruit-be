import { Injectable, Inject } from "@nestjs/common";
import {
  IOrganizationRepository,
  Organization,
  OrganizationTypeEnum,
  OrganizationWithDetails,
} from "@/core";
import { organizations } from "../models/organization.model";
import { companies } from "../models/company.model";
import { schools } from "../models/school.model";
import { type DBDrizzle } from "../types";
import { GenericRepository } from "./generic-repository";
import { eq } from "drizzle-orm";
import { UpdateOrganizationDto } from "@/interfaces/dtos";

@Injectable()
export class OrganizationRepository
  extends GenericRepository<Organization, typeof organizations>
  implements IOrganizationRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, organizations);
  }

  async getOrganizationById(id: string): Promise<Organization | null> {
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
        organizationCulture: organizations.organizationCulture,
        employeesMin: organizations.employeesMin,
        employeesMax: organizations.employeesMax,
        status: organizations.status,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        deletedAt: organizations.deletedAt,
        // Company fields (nullable)
        companySize: companies.companySize,
        taxCode: companies.taxCode,
        benefits: companies.benefits,
        companyRawId: companies.companyRawId,
        // School fields (nullable)
        schoolType: schools.schoolType,
      })
      .from(organizations)
      .leftJoin(companies, eq(organizations.id, companies.organizationId))
      .leftJoin(schools, eq(organizations.id, schools.organizationId))
      .where(eq(organizations.id, id))
      .limit(1);

    return result[0] || null;
  }

  /**
   * Get organization with attached sub-table data based on type
   *
   * This method uses LEFT JOINs to fetch organization data along with company/school/nonprofit info in a single query.
   * Instead of making multiple queries (1 for organization + 1 for company/school), this uses JOINs for better performance.
   *
   * How it works:
   * 1. Main query selects from organizations table
   * 2. LEFT JOIN with companies table (only matches if organization.type = 'company')
   * 3. LEFT JOIN with schools table (only matches if organization.type = 'school' or 'university')
   * 4. Result is transformed to attach appropriate sub-table data based on organization.type
   *
   * Benefits:
   * - Single database round-trip instead of multiple queries
   * - Better performance for large datasets
   * - Atomic operation (all data fetched together)
   *
   * @param id - Organization ID
   * @returns OrganizationWithDetails or null if not found
   */
  async getOrganizationWithDetails(
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
        organizationCulture: organizations.organizationCulture,
        employeesMin: organizations.employeesMin,
        employeesMax: organizations.employeesMax,
        status: organizations.status,
        createdAt: organizations.createdAt,
        updatedAt: organizations.updatedAt,
        deletedAt: organizations.deletedAt,
        // Company fields (nullable)
        companySize: companies.companySize,
        taxCode: companies.taxCode,
        benefits: companies.benefits,
        companyRawId: companies.companyRawId,
        // School fields (nullable)
        schoolType: schools.schoolType,
      })
      .from(organizations)
      .leftJoin(companies, eq(organizations.id, companies.organizationId))
      .leftJoin(schools, eq(organizations.id, schools.organizationId))
      .where(eq(organizations.id, id))
      .limit(1);

    const row = result[0];
    if (!row) return null;

    // Transform the flat result into a structured object based on organization type
    const organizationWithDetails: OrganizationWithDetails = {
      // Base organization data
      id: row.id,
      name: row.name,
      slug: row.slug,
      type: row.type,
      description: row.description,
      address: row.address,
      logoUrl: row.logoUrl,
      about: row.about,
      websiteUrl: row.websiteUrl,
      email: row.email,
      phone: row.phone,
      foundedYear: row.foundedYear,
      verifiedAt: row.verifiedAt,
      organizationCulture: row.organizationCulture,
      employeesMin: row.employeesMin,
      employeesMax: row.employeesMax,
      status: row.status,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      deletedAt: row.deletedAt,
      companySize: row.companySize,
      taxCode: row.taxCode,
      benefits: row.benefits,
      companyRawId: row.companyRawId,
    };

    // Attach type-specific data based on organization type
    switch (row.type) {
      case OrganizationTypeEnum.COMPANY:
        if (
          row.companySize !== null ||
          row.taxCode !== null ||
          row.benefits !== null ||
          row.companyRawId !== null
        ) {
          organizationWithDetails.companySize = row.companySize;
          organizationWithDetails.taxCode = row.taxCode;
          organizationWithDetails.benefits = row.benefits;
          organizationWithDetails.companyRawId = row.companyRawId;
        }
        break;
    }

    return organizationWithDetails;
  }

  async updateOrganizationById(
    id: string,
    data: UpdateOrganizationDto,
  ): Promise<Organization | null> {
    const result = await this.db
      .update(organizations)
      .set(data)
      .where(eq(organizations.id, id))
      .returning();
    return result[0] || null;
  }
}
