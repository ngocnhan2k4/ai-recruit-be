import { Injectable, Inject } from "@nestjs/common";
import { ISchoolRepository, NewSchool, School } from "@/core";
import { companies } from "../models/company.model";
import { DBDrizzleTransaction, type DBDrizzle } from "../types";
import { GenericRepository } from "./generic-repository";
import { asc, count, gt } from "drizzle-orm";
import { isNull } from "drizzle-orm";
import { eq, and, ilike } from "drizzle-orm";
import { PaginatedResult } from "@/common/types";
import {
  organizationLocations,
  organizations,
} from "../models/organization.model";
import { OrganizationTypeEnum } from "@/core";
import { schools } from "../schema";
import { SchoolFilters } from "@/core/entities/school.entity";

@Injectable()
export class SchoolRepository
  extends GenericRepository<School, typeof schools>
  implements ISchoolRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, schools);
  }

  async getSchoolByOrganizationId(
    organizationId: string,
  ): Promise<School | null> {
    const result = await this.db
      .select()
      .from(schools)
      .innerJoin(organizations, eq(schools.organizationId, organizations.id))
      .where(
        and(
          eq(organizations.type, OrganizationTypeEnum.SCHOOL),
          eq(schools.organizationId, organizationId),
        ),
      );

    if (!result[0]) return null;

    const row = result[0];
    return {
      ...row.organizations,
      organizationId: row.organizations.id,
      schoolType: row.schools.schoolType || null,
    };
  }

  async getSchools(
    limit = 20,
    filter?: SchoolFilters,
    cursor?: string,
  ): Promise<
    PaginatedResult<Pick<School, "id" | "name" | "logoUrl" | "address">>
  > {
    const whereConditions = [isNull(schools.deletedAt)];

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

  async createSchool(
    data: NewSchool,
    tx?: DBDrizzleTransaction,
  ): Promise<School> {
    const database = tx || this.db;
    const insertData = {
      ...data,
    };
    const result = await database
      .insert(companies)
      .values(insertData)
      .returning();
    return {
      ...data,
      organizationId: result[0].organizationId,
    } as School;
  }

  async updateSchool(
    orgId: string,
    data: Partial<NewSchool>,
    tx?: DBDrizzleTransaction,
  ): Promise<School> {
    const dbClient = tx || this.db;
    const [updatedSchool] = await dbClient
      .update(schools)
      .set({
        ...data,
      })
      .where(eq(schools.organizationId, orgId))
      .returning();
    return updatedSchool as School;
  }
}
