import { Injectable, Inject } from "@nestjs/common";
import {
  IOrganizationRepository,
  NewOrganizationWithDetails,
  OrganizationTypeEnum,
  OrganizationWithDetails,
  SchoolTypeEnum,
} from "@/core";
import {
  organizationLocations,
  organizationMembers,
  organizations,
} from "../models/organization.model";
import { companies } from "../models/company.model";
import { schools } from "../models/school.model";
import { DBDrizzleTransaction, type DBDrizzle } from "../types";
import { GenericRepository } from "./generic-repository";
import {
  eq,
  desc,
  and,
  gt,
  SQL,
  isNotNull,
  inArray,
  isNull,
  sql,
  or,
  lt,
} from "drizzle-orm";
import { OrganizationQuery } from "@/core/entities/organization.entity";
import { provinces } from "../models";

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
      .select({
        id: organizationLocations.id,
        organizationId: organizationLocations.organizationId,
        address: organizationLocations.address,
        provinceId: organizationLocations.provinceId,
        provinceName: provinces.name,
        createdAt: organizationLocations.createdAt,
        updatedAt: organizationLocations.updatedAt,
        deletedAt: organizationLocations.deletedAt,
      })
      .from(organizationLocations)
      .leftJoin(provinces, eq(organizationLocations.provinceId, provinces.id))
      .where(eq(organizationLocations.organizationId, id))
      .execute();

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

  async getAllOrganizations(query: OrganizationQuery) {
    const whereConditions: SQL<unknown>[] = [isNull(organizations.deletedAt)];

    if (query.keyword) {
      whereConditions.push(
        sql`similarity(unaccent(${organizations.name}), unaccent(${query.keyword})) > 0.22`,
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

    if (query.provinceIds?.length) {
      whereConditions.push(
        inArray(organizationLocations.provinceId, query.provinceIds),
      );
    }

    if (query.userId) {
      whereConditions.push(eq(organizationMembers.userId, query.userId));
    }

    if (query.cursor) {
      whereConditions.push(lt(organizations.createdAt, new Date(query.cursor)));
    }

    const baseSelect = {
      id: organizations.id,
      name: organizations.name,
      logoUrl: organizations.logoUrl,
      description: organizations.description,
      foundedYear: organizations.foundedYear,
      role: organizationMembers.role,
      verifiedAt: organizations.verifiedAt,
      createdAt: organizations.createdAt,
    } as const;

    const selectFields = query.keyword
      ? {
          ...baseSelect,
          similarity:
            sql`similarity(unaccent(${organizations.name}), unaccent(${query.keyword}))`.as(
              "similarity",
            ),
        }
      : baseSelect;

    const results = await this.db
      .select(selectFields)
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
      .groupBy(organizations.id, organizationMembers.role)
      .limit(query.limit + 1);

    const hasNextPage = results.length > query.limit;
    const data = hasNextPage ? results.slice(0, query.limit) : results;

    const nextCursor =
      hasNextPage && data.length > 0
        ? data[data.length - 1].createdAt.toISOString()
        : null;

    return {
      data,
      pagination: {
        nextCursor,
        hasNextPage,
      },
    };
  }

  async getAllNamesByType(
    type: OrganizationTypeEnum,
  ): Promise<Pick<OrganizationWithDetails, "name">[]> {
    const result = await this.db
      .select({
        name: organizations.name,
      })
      .from(organizations)
      .where(eq(organizations.type, type));

    return result;
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

  async checkNameMightExist(name: string, score: number): Promise<boolean> {
    const whereConditions: SQL<unknown>[] = [
      sql`similarity(unaccent(${organizations.name}), unaccent(${name})) >= ${score}`,
      isNull(organizations.deletedAt),
    ];

    const result = await this.db
      .select({
        id: organizations.id,
      })
      .from(organizations)
      .where(and(...whereConditions))
      .limit(1);

    return result.length > 0;
  }

  async createOrganization(
    data: NewOrganizationWithDetails,
    tx?: DBDrizzleTransaction,
  ): Promise<OrganizationWithDetails> {
    const dbClient = tx ?? this.db;
    const [org] = await dbClient
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

    return org;
  }

  async updateOrganizationById(
    id: string,
    data: Partial<OrganizationWithDetails>,
    tx?: DBDrizzleTransaction,
  ): Promise<OrganizationWithDetails> {
    const dbClient = tx ?? this.db;
    const [org] = await dbClient
      .update(organizations)
      .set(data)
      .where(eq(organizations.id, id))
      .returning();
    return org;
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

  async getOrganizationsByTypes(
    types: OrganizationTypeEnum[],
  ): Promise<OrganizationWithDetails[]> {
    const result = await this.db
      .select({
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
        companySize: companies.companySize,
        taxCode: companies.taxCode,
        benefits: companies.benefits,
        companyRawId: companies.companyRawId,
        culture: companies.culture,
        schoolType: schools.schoolType,
      })
      .from(organizations)
      .leftJoin(companies, eq(organizations.id, companies.organizationId))
      .leftJoin(schools, eq(organizations.id, schools.organizationId))
      .where(or(...types.map((type) => eq(organizations.type, type))));

    if (!result) return [];

    return result.map((row) => ({
      ...row,
      companySize: row.companySize,
      taxCode: row.taxCode,
      benefits: row.benefits,
      culture: row.culture,
      schoolType: row.schoolType as SchoolTypeEnum,
    }));
  }
}
