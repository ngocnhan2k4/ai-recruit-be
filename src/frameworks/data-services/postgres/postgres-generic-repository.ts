import { eq, and, gt, getTableColumns, asc, sql, ilike } from "drizzle-orm";
import {
  IGenericRepository,
  IAuthGenericRepository,
  IJobGenericRepository,
  ICategoryGenericRepository,
} from "../../../core";
import { Inject } from "@nestjs/common";
import { categories, jobs, companies, skills, jobSkills } from "./model";
import { type DBDrizzle } from "@/frameworks/data-services/postgres/helpers";

export class PostgresGenericRepository<T, TTable>
  implements IGenericRepository<T>
{
  protected _table: TTable;
  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
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
      .values(
        item as {
          [key: string]: any;
        },
      )
      .returning();
    return result[0] as T;
  }

  async update(id: number, item: T): Promise<T | null> {
    const result = await this.db
      .update(this._table as any)
      .set(
        item as {
          [key: string]: any;
        },
      )
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

export class JobPostgresGenericRepository<TJob, TCompany, TSkill, JobTable>
  extends PostgresGenericRepository<TJob, JobTable>
  implements IJobGenericRepository<TJob, TCompany, TSkill>
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, jobs as JobTable);
  }

  async getAllJobs(
    limit = 50,
    offset = 0,
    keyword = "",
  ): Promise<{ job: TJob; company: TCompany; skills: TSkill[] }[]> {
    const {
      id: _jobId,
      company_id: _company_id,
      ...restJob
    } = getTableColumns(jobs);
    const { id: _companyId, ...restCompany } = getTableColumns(companies);

    const result = (await this.db
      .select({
        job: { ...restJob },
        company: { ...restCompany },
        skills: sql`coalesce(json_agg(distinct ${skills.name}) filter (where ${skills.name} is not null), '[]')`,
      })
      .from(jobs)
      .innerJoin(companies, eq(jobs.company_id, companies.id))
      .leftJoin(jobSkills, eq(jobs.id, jobSkills.job_id))
      .leftJoin(skills, eq(jobSkills.skill_id, skills.id))
      .where(ilike(jobs.title, `%${keyword}%`))
      .groupBy(jobs.id, companies.id)
      .orderBy(asc(jobs.id))
      .limit(limit)
      .offset(offset)) as { job: TJob; company: TCompany; skills: TSkill[] }[];

    return result;
  }
}

export class CategoryPostgresGenericRepository<TCategory, TTable>
  extends PostgresGenericRepository<TCategory, TTable>
  implements ICategoryGenericRepository<TCategory>
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, categories as TTable);
  }

  async getCategories(): Promise<TCategory[]> {
    const result = (await this.db.select().from(categories)) as TCategory[];

    return result;
  }
}
