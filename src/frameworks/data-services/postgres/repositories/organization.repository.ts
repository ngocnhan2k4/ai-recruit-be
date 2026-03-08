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
  gte,
  lte,
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
import { GeneralQuery } from "@/common/types";

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
      whereConditions.push(gte(organizations.employeesMin, query.employeeMin));
    }

    if (query.employeeMax !== undefined) {
      whereConditions.push(lte(organizations.employeesMax, query.employeeMax));
    }

    if (query.verified) {
      whereConditions.push(isNotNull(organizations.verifiedAt));
    }

    if (query.provinceIds?.length) {
      whereConditions.push(
        inArray(organizationLocations.provinceId, query.provinceIds),
      );
    }

    const usePage = query.page != null && query.page >= 1;
    if (!usePage && query.cursor) {
      whereConditions.push(lt(organizations.createdAt, new Date(query.cursor)));
    }

    const baseSelect = {
      id: organizations.id,
      name: organizations.name,
      type: organizations.type,
      logoUrl: organizations.logoUrl,
      description: organizations.description,
      email: organizations.email,
      phone: organizations.phone,
      foundedYear: organizations.foundedYear,
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

    // Count total with same filters (for page-based pagination)
    const countResult = await this.db
      .select({ count: sql<number>`count(distinct ${organizations.id})` })
      .from(organizations)
      .leftJoin(
        organizationLocations,
        eq(organizations.id, organizationLocations.organizationId),
      )
      .where(and(...whereConditions));
    const total = Number(countResult[0]?.count ?? 0);

    const limit = query.limit + (usePage ? 0 : 1); // when cursor-based, request limit+1 to detect hasNext
    const offset = usePage ? (query.page! - 1) * query.limit : 0;

    const baseQuery = this.db
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
      .groupBy(organizations.id);

    const results =
      offset > 0
        ? await baseQuery.offset(offset).limit(limit)
        : await baseQuery.limit(limit);

    const hasNextPage = usePage
      ? query.page! * query.limit < total
      : results.length > query.limit;
    const data = usePage
      ? results
      : hasNextPage
        ? results.slice(0, query.limit)
        : results;

    const nextCursor =
      !usePage && hasNextPage && data.length > 0
        ? data[data.length - 1].createdAt.toISOString()
        : null;

    return {
      data,
      pagination: {
        nextCursor,
        hasNextPage,
        total,
      },
    };
  }

  async getMyOrganizations(userId: string, query: GeneralQuery) {
    const whereConditions: SQL<unknown>[] = [
      isNull(organizations.deletedAt),
      isNull(organizationMembers.deletedAt),
    ];

    whereConditions.push(eq(organizationMembers.userId, userId));

    if (query.cursor) {
      whereConditions.push(lt(organizations.createdAt, new Date(query.cursor)));
    }

    const results = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        logoUrl: organizations.logoUrl,
        description: organizations.description,
        foundedYear: organizations.foundedYear,
        verifiedAt: organizations.verifiedAt,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .innerJoin(
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
