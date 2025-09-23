import { eq, and, gt, getTableColumns } from "drizzle-orm";
import {
  IGenericRepository,
  IAuthGenericRepository,
  IJobGenericRepository,
} from "../../../core";
//import { db } from "./db";
import { Inject } from "@nestjs/common";
import { JobRaw } from "@/core/entities/jobRaw.entity";
import { CompanyRaw } from "@/core/entities/companyRaw.entity";
import { jobRaws, companyRaws } from "./model";

export class PostgresGenericRepository<T, TTable>
  implements IGenericRepository<T>
{
  protected _table: TTable;
  constructor(
    @Inject("DRIZZLE") protected db,
    table: TTable,
  ) {
    this._table = table;
  }

  async getAll(): Promise<T[]> {
    return (await this.db.select().from(this._table as any)) as T[];
  }
  async get(id: number): Promise<T | null> {
    const result = await this.db
      .select()
      .from(this._table as any)
      .where(eq((this._table as any).id, id));
    return (result[0] as T) || null;
  }
  async getByField(field: Partial<T>): Promise<T | null> {
    const keys = Object.keys(field) as (keyof T)[];
    if (keys.length === 0) {
      return null;
    }
    const conditions = keys.map((key) =>
      eq((this._table as any)[key as string], field[key]),
    );
    const query = this.db
      .select()
      .from(this._table as any)
      .where(and(...conditions));

    const result = await query;
    return (result[0] as T) || null;
  }

  async create(item: T): Promise<T> {
    const result = await this.db
      .insert(this._table as any)
      .values(item as any)
      .returning();
    return result[0] as T;
  }

  async update(id: number, item: T): Promise<T | null> {
    const result = await this.db
      .update(this._table as any)
      .set(item as any)
      .where(eq((this._table as any).id, id))
      .returning();
    return (result[0] as T) || null;
  }
}

export class AuthPostgresGenericRepository<T, TTable>
  extends PostgresGenericRepository<T, TTable>
  implements IAuthGenericRepository<T>
{
  async revoke(token: string): Promise<void> {
    await this.db
      .update(this._table as any)
      .set({ revoked: true })
      .where(eq((this._table as any).token, token))
      .execute();
  }
  async findValidToken(token: string): Promise<T | null> {
    const result = await this.db
      .select()
      .from(this._table as any)
      .where(
        and(
          eq((this._table as any).token, token),
          eq((this._table as any).revoked, false),
          gt((this._table as any).expiresAt, new Date()),
        ),
      );
    return (result[0] as T) || null;
  }
}

export class JobPostgresGenericRepository<TJob, TCompany, TTable>
  extends PostgresGenericRepository<TJob, TTable>
  implements IJobGenericRepository<TJob, TCompany>
{
  constructor(@Inject("DRIZZLE") protected db) {
    super(db, jobRaws as TTable);
  }

  async getAllJobs(limit = 50): Promise<{ job: TJob; company: TCompany }[]> {
    const { id: _jobId, ...restJob } = getTableColumns(jobRaws);
    const { id: _companyId, ...restCompany } = getTableColumns(companyRaws);

    return (await this.db
      .select({
        job: { ...restJob },
        company: { ...restCompany },
      })
      .from(jobRaws)
      .innerJoin(companyRaws, eq(jobRaws.company_id, companyRaws.id))
      .limit(limit)) as { job: TJob; company: TCompany }[];
  }
}
