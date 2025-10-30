import { Injectable, Inject } from "@nestjs/common";
import {
  Company,
  IOrganizationRepository,
  NewOrganizationWithDetails,
  OrganizationLocation,
  OrganizationTypeEnum,
  OrganizationWithDetails,
  School,
  SchoolTypeEnum,
} from "@/core";
import {
  organizationLocations,
  organizationMembers,
  organizations,
} from "../models/organization.model";
import { companies } from "../models/company.model";
import { schools } from "../models/school.model";
import { type DBDrizzle } from "../types";
import { GenericRepository } from "./generic-repository";
import {
  eq,
  desc,
  and,
  gt,
  SQL,
  ilike,
  isNotNull,
  inArray,
  isNull,
} from "drizzle-orm";
import { PaginatedResult } from "@/common/types/api";
import { slugify } from "@/common/utils/string";
import { OrganizationQuery } from "@/core/entities/organization.entity";

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

    const locations = await this.db
      .select()
      .from(organizationLocations)
      .where(eq(organizationLocations.organizationId, id));

    const row = result[0];
    return {
      ...row,
      companySize: row.companySize,
      taxCode: row.taxCode,
      benefits: row.benefits,
      culture: row.culture,
      schoolType: row.schoolType as SchoolTypeEnum,
      locations: locations,
    };
  }

  async getAllOrganizations(
    query: OrganizationQuery,
  ): Promise<
    PaginatedResult<
      Pick<
        OrganizationWithDetails,
        "id" | "name" | "logoUrl" | "description" | "foundedYear" | "verifiedAt"
      >
    >
  > {
    const whereConditions: SQL<unknown>[] = [isNull(organizations.deletedAt)];

    if (query.keyword) {
      whereConditions.push(ilike(organizations.name, `%${query.keyword}%`));
      whereConditions.push(
        ilike(organizations.slug, `%${slugify(query.keyword)}%`),
      );
    }

    if (query.employeeMin !== undefined) {
      whereConditions.push(gt(organizations.employeesMin, query.employeeMin));
    }

    if (query.employeeMax !== undefined) {
      whereConditions.push(gt(organizations.employeesMax, query.employeeMax));
    }

    if (query.verified) {
      whereConditions.push(isNotNull(organizations.verifiedAt));
    }

    if (query.provinceIds && query.provinceIds.length > 0) {
      whereConditions.push(
        inArray(organizationLocations.provinceId, query.provinceIds),
      );
    }

    if (query.userId) {
      whereConditions.push(eq(organizationMembers.userId, query.userId));
    }

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
        verifiedAt: organizations.verifiedAt,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .leftJoin(
        organizationLocations,
        eq(organizations.id, organizationLocations.organizationId),
      )
      .leftJoin(
        organizationMembers,
        eq(organizations.id, organizationMembers.organizationId),
      )
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

  async createOrganization(
    data: NewOrganizationWithDetails,
    userId: string,
  ): Promise<OrganizationWithDetails> {
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

      let company: Company = {} as Company;
      let school: School = {} as School;

      if (org.type === OrganizationTypeEnum.COMPANY) {
        company = await tx
          .insert(companies)
          .values({
            organizationId: org.id,
            companySize: data.companySize,
            taxCode: data.taxCode,
            benefits: data.benefits,
          })
          .returning()[0];
      } else if (org.type === OrganizationTypeEnum.SCHOOL) {
        school = await tx
          .insert(schools)
          .values({
            organizationId: org.id,
            schoolType: (data.schoolType as any) ?? SchoolTypeEnum.UNIVERSITY,
          })
          .returning()[0];
      }

      await tx
        .insert(organizationMembers)
        .values({
          organizationId: org.id,
          userId: userId,
          role: "organization_owner",
        })
        .execute();

      return {
        ...org,
        ...company,
        ...school,
        schoolType: (school?.schoolType as SchoolTypeEnum) ?? undefined,
        locations: orgLocations,
      };
    });

    return dt;
  }

  async updateOrganizationById(
    id: string,
    data: Partial<OrganizationWithDetails>,
  ): Promise<OrganizationWithDetails> {
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
      const [[company], [school]] = await Promise.all([
        tx
          .update(companies)
          .set({
            companySize: data.companySize,
            taxCode: data.taxCode,
            benefits: data.benefits,
          })
          .where(eq(companies.organizationId, org.id))
          .returning(),
        tx
          .update(schools)
          .set({
            schoolType: data.schoolType as any,
          })
          .where(eq(schools.organizationId, org.id))
          .returning(),
      ]);

      return {
        ...org,
        ...company,
        ...school,
        schoolType: (school?.schoolType as SchoolTypeEnum) ?? undefined,
        locations: allLocations,
      };
    });

    return dt;
  }

  async deleteOrganizationById(id: string): Promise<boolean> {
    const result = await this.db
      .update(organizations)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(organizations.id, id))
      .execute();

    return (result.rowCount ?? 0) > 0;
  }
}
