import { Injectable, Inject, Logger } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { SHORT_TTL, LONG_TTL, CACHE_KEYS } from "@/common/constants";
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
  countDistinct,
  asc,
} from "drizzle-orm";
import { OrganizationQuery } from "@/core/entities/organization.entity";
import { provinces } from "../models";
import { GeneralQuery } from "@/common/types";
import { cacheWithDedup, convertDateToStr } from "@/common/utils";
import { startOfDay } from "node_modules/date-fns/startOfDay";
import { endOfDay } from "node_modules/date-fns/endOfDay";

@Injectable()
export class OrganizationRepository
  extends GenericRepository<OrganizationWithDetails, typeof organizations>
  implements IOrganizationRepository
{
  private readonly logger = new Logger(OrganizationRepository.name);

  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {
    super(db, organizations);
  }

  get(id: string): Promise<OrganizationWithDetails | null> {
    const key = CACHE_KEYS.organization.get(id);
    return cacheWithDedup<OrganizationWithDetails | null>(
      key,
      () => this.cacheManager.get<OrganizationWithDetails | null>(key),
      () => super.get(id),
      (data: OrganizationWithDetails | null) =>
        this.cacheManager.set<OrganizationWithDetails | null>(
          key,
          data,
          SHORT_TTL,
        ),
      {
        logger: this.logger,
      },
    );
  }

  async update(
    where: Partial<OrganizationWithDetails>,
    item: Partial<OrganizationWithDetails>,
    tx?: DBDrizzleTransaction,
  ): Promise<OrganizationWithDetails[]> {
    const data = await super.update(where, item, tx);

    const keys: string[] = [];
    for (const org of data) {
      const keyGet = CACHE_KEYS.organization.get(org.id);
      const keyGetWithDetail = CACHE_KEYS.organization.getWithDetail(org.id);
      const keyGetNamesByType = CACHE_KEYS.organization.getNamesByType(
        org.type,
      );
      keys.push(keyGet, keyGetWithDetail, keyGetNamesByType);
    }
    await this.cacheManager
      .mdel(keys)
      .catch((err) =>
        this.logger.warn(
          `[cache] Failed to invalidate cache for organizations ${keys.join(
            ",",
          )}:`,
          err,
        ),
      );
    return data;
  }

  async delete(
    where: Partial<OrganizationWithDetails>,
    tx?: DBDrizzleTransaction,
  ): Promise<OrganizationWithDetails[]> {
    const data = await super.delete(where, tx);

    const keys: string[] = [];
    for (const org of data) {
      const keyGet = CACHE_KEYS.organization.get(org.id);
      const keyGetWithDetail = CACHE_KEYS.organization.getWithDetail(org.id);
      keys.push(keyGet, keyGetWithDetail);
    }
    await this.cacheManager
      .mdel(keys)
      .catch((err) =>
        this.logger.warn(
          `[cache] Failed to invalidate cache for organizations ${keys.join(
            ",",
          )}:`,
          err,
        ),
      );
    return data;
  }

  async getOrganizationById(
    id: string,
  ): Promise<OrganizationWithDetails | null> {
    const cacheKey = CACHE_KEYS.organization.getWithDetail(id);
    return cacheWithDedup<OrganizationWithDetails | null>(
      cacheKey,
      () => this.cacheManager.get<OrganizationWithDetails | null>(cacheKey),
      async () => {
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

        if (!result[0]) {
          await this.cacheManager.set(cacheKey, null, SHORT_TTL);
          return null;
        }

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
          .leftJoin(
            provinces,
            eq(organizationLocations.provinceId, provinces.id),
          )
          .where(eq(organizationLocations.organizationId, id))
          .execute();

        const row = result[0];

        const mappedResult = {
          ...row,
          companySize: row.companySize,
          taxCode: row.taxCode,
          benefits: row.benefits,
          culture: row.culture,
          schoolType: row.schoolType as SchoolTypeEnum,
          locations: locations,
        };
        return mappedResult;
      },
      (data: OrganizationWithDetails | null) =>
        this.cacheManager.set<OrganizationWithDetails | null>(
          cacheKey,
          data,
          SHORT_TTL,
        ),
      {
        logger: this.logger,
      },
    );
  }

  async getOrganizations(query: OrganizationQuery) {
    const limit = query.limit;

    const whereConditions: SQL<unknown>[] = this.buildOrganizationQuery(query);

    if (query.cursor) {
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
      .groupBy(organizations.id)
      .limit(limit + 1);
    const hasNextPage = results.length > limit;
    const data = hasNextPage ? results.slice(0, limit) : results;
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

  async getOrganizationsByAdmin(query: OrganizationQuery) {
    const limit = query.limit;
    const page = Math.max(query.page ?? 1, 1);

    const whereConditions: SQL<unknown>[] = this.buildOrganizationQuery(query);

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

    const offset = query.page ? (page - 1) * limit : 0;

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
      .groupBy(organizations.id)
      .offset(offset)
      .limit(limit + 1);

    const countResult = await this.db
      .select({ count: sql<number>`count(distinct ${organizations.id})` })
      .from(organizations)
      .leftJoin(
        organizationLocations,
        eq(organizations.id, organizationLocations.organizationId),
      )
      .where(and(...whereConditions));
    const total = Number(countResult[0]?.count ?? 0);

    const hasNextPage = results.length > limit;
    const data = hasNextPage ? results.slice(0, limit) : results;

    return {
      data,
      pagination: {
        hasNextPage,
        total,
      },
    };
  }

  private buildOrganizationQuery(query: OrganizationQuery) {
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

    return whereConditions;
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
        role: organizationMembers.role,
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

    const resultToSend = {
      data,
      pagination: {
        nextCursor,
        hasNextPage,
      },
    };
    return resultToSend;
  }

  getAllNamesByType(
    type: OrganizationTypeEnum,
  ): Promise<Pick<OrganizationWithDetails, "name">[]> {
    const key = CACHE_KEYS.organization.getNamesByType(type);
    return cacheWithDedup<Pick<OrganizationWithDetails, "name">[]>(
      key,
      () => this.cacheManager.get<Pick<OrganizationWithDetails, "name">[]>(key),
      async () => {
        return this.db
          .select({
            name: organizations.name,
          })
          .from(organizations)
          .where(eq(organizations.type, type));
      },
      (data: Pick<OrganizationWithDetails, "name">[]) =>
        this.cacheManager.set<Pick<OrganizationWithDetails, "name">[]>(
          key,
          data,
          LONG_TTL,
        ),
      {
        logger: this.logger,
      },
    );
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

    await this.cacheManager
      .mdel([
        CACHE_KEYS.organization.get(id),
        CACHE_KEYS.organization.getWithDetail(id),
      ])
      .catch((err) =>
        this.logger.warn(
          `[cache] Failed to invalidate cache for organization ${id}:`,
          err,
        ),
      );

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

    const resultToSend = result.map((row) => ({
      ...row,
      companySize: row.companySize,
      taxCode: row.taxCode,
      benefits: row.benefits,
      culture: row.culture,
      schoolType: row.schoolType as SchoolTypeEnum,
    }));

    return resultToSend;
  }

  async getOrganizationTrends(params: {
    fromDate?: string;
    toDate?: string;
  }): Promise<{ date: string; count: number }[]> {
    const { fromDate, toDate } = params;

    const whereConditions: SQL[] = [isNull(organizations.deletedAt)];

    if (fromDate) {
      whereConditions.push(
        gte(organizations.createdAt, startOfDay(new Date(fromDate))),
      );
    }
    if (toDate) {
      whereConditions.push(
        lte(organizations.createdAt, endOfDay(new Date(toDate))),
      );
    }

    const dateExpr = sql`DATE(${organizations.createdAt})`;

    const result = await this.db
      .select({
        date: dateExpr,
        count: countDistinct(organizations.id).as("count"),
      })
      .from(organizations)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(dateExpr)
      .orderBy(asc(dateExpr));

    return result.map((r) => ({
      date: convertDateToStr(r.date as string),
      count: Number(r.count),
    }));
  }

  async countOrganizationsByTypes(
    types: OrganizationTypeEnum[],
  ): Promise<number> {
    const [row] = await this.db
      .select({
        count: countDistinct(organizations.id).as("count"),
      })
      .from(organizations)
      .where(
        and(
          isNull(organizations.deletedAt),
          inArray(organizations.type, types),
        ),
      );

    return Number(row?.count ?? 0);
  }
}
