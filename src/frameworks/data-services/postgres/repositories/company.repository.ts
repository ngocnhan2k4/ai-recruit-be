import { Injectable, Inject } from "@nestjs/common";
import { ICompanyRepository, Company } from "@/core";
import { companies } from "../models/company.model";
import { type DBDrizzle } from "../types";
import { GenericRepository } from "./generic-repository";
import { PaginatedResult } from "@/common/types/api";
import { ilike, gt, and } from "drizzle-orm/sql/expressions/conditions";
import { asc, SQL } from "drizzle-orm";
import { orderBy } from "lodash";

@Injectable()
export class CompanyRepository
  extends GenericRepository<Company, typeof companies>
  implements ICompanyRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, companies);
  }
  getCompaniesByUserId(
    userId: string,
    limit: number,
    cursor: string,
  ): Promise<
    PaginatedResult<Pick<Company, "id" | "name" | "logoUrl" | "description">>
  > {
    throw new Error("Method not implemented.");
  }
  createCompany(org: Partial<Company>): Promise<Company> {
    throw new Error("Method not implemented.");
  }
  updateCompany(
    companyId: string,
    company: Partial<Company>,
  ): Promise<Company | null> {
    throw new Error("Method not implemented.");
  }
  deleteCompany(companyId: string): Promise<boolean> {
    throw new Error("Method not implemented.");
  }
  getCompanyById(companyId: string): Promise<Company | null> {
    throw new Error("Method not implemented.");
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

  async getCompanies(
    limit = 20,
    keyword?: string,
    cursor?: string,
  ): Promise<
    PaginatedResult<Pick<Company, "id" | "name" | "logoUrl" | "address">>
  > {
    // Build where conditions
    const whereConditions: SQL[] = [];

    if (keyword) {
      whereConditions.push(ilike(companies.name, `%${keyword}%`));
    }

    if (cursor) {
      whereConditions.push(gt(companies.id, cursor));
    }

    const query = this.db
      .select({
        id: companies.id,
        name: companies.name,
        logoUrl: companies.logoUrl,
        address: companies.address,
      })
      .from(companies)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(asc(companies.id))
      .limit(limit + 1);

    const rows = await query;
    const hasNextPage = rows.length > limit;
    const data = hasNextPage ? rows.slice(0, limit) : rows;
    return {
      data,
      pagination: {
        cursor: data.length > 0 ? data[data.length - 1].id : null,
        hasNextPage,
      },
    };
  }
}
