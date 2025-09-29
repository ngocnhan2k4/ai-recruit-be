import {
  eq,
  and,
  gt,
  getTableColumns,
  isNotNull,
  lte,
  gte,
  countDistinct,
  or,
  isNull,
  SQL,
  sql,
  ilike,
  asc,
} from "drizzle-orm";
import {
  IGenericRepository,
  IAuthGenericRepository,
  IJobGenericRepository,
  ICategoryGenericRepository,
  StatisticsJobFilter,
  IUserExperienceGenericRepository,
  IUserSkillGenericRepository,
} from "../../../core";
import { Inject } from "@nestjs/common";
import {
  categories,
  jobs,
  companies,
  skills,
  jobSkills,
  jobCategories,
  users,
  userSkills,
} from "./model";
import { type DBDrizzle } from "@/frameworks/data-services/postgres/helpers";
import { convertDateToStr } from "@/common/utils/date";
import { UpdateUserExperienceDto } from "@/interfaces/dtos";

export class PostgresGenericRepository<T, TTable>
  implements IGenericRepository<T> {
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

  async delete(id: number | string): Promise<T | null> {
    const result = await this.db
      .delete(this._table as any)
      .where(eq((this._table as any).id, id))
      .returning();
    return (result[0] as T) || null;
  }
}

export class AuthPostgresGenericRepository<T, TTable>
  extends PostgresGenericRepository<T, TTable>
  implements IAuthGenericRepository<T> {
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
  implements IJobGenericRepository<TJob, TCompany, TSkill> {
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
      companyId: _company_id,
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
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .leftJoin(jobSkills, eq(jobs.id, jobSkills.jobId))
      .leftJoin(skills, eq(jobSkills.skillId, skills.id))
      .where(ilike(jobs.title, `%${keyword}%`))
      .groupBy(jobs.id, companies.id)
      .orderBy(asc(jobs.id))
      .limit(limit)
      .offset(offset)) as { job: TJob; company: TCompany; skills: TSkill[] }[];

    return result;
  }

  async getFrequentlyJobs(
    filter: StatisticsJobFilter,
  ): Promise<{ date: string; count: number }[]> {
    const conditions = this.buildJobFilterQuery(filter);

    const result = await this.db
      .select({
        date: jobs.datePosted,
        count: countDistinct(jobs.id).as("count"),
      })
      .from(jobs)
      .leftJoin(jobCategories, eq(jobs.id, jobCategories.jobId))
      .where(and(...conditions))
      .groupBy(jobs.datePosted);

    return result as { date: string; count: number }[];
  }

  async count(filter: StatisticsJobFilter): Promise<number> {
    const conditions = this.buildJobFilterQuery(filter);

    const result = await this.db
      .select({
        totalJobs: countDistinct(jobs.id).as("totalJobs"),
      })
      .from(jobs)
      .leftJoin(jobCategories, eq(jobs.id, jobCategories.jobId))
      .where(and(...conditions));

    return result[0]?.totalJobs ?? 0;
  }

  buildJobFilterQuery(
    {
      fromDate,
      toDate,
      categoryId,
      provinceId,
      isOpen,
      haveDatePosted,
    }: StatisticsJobFilter & {
      haveDatePosted?: boolean;
    },
    jobsTable: typeof jobs = jobs,
  ): (SQL<unknown> | undefined)[] {
    const conditions: (SQL<unknown> | undefined)[] = [
      haveDatePosted ? isNotNull(jobsTable.datePosted) : undefined,
      fromDate
        ? gte(jobsTable.datePosted, convertDateToStr(fromDate))
        : undefined,
      toDate ? lte(jobsTable.datePosted, convertDateToStr(toDate)) : undefined,
      categoryId ? eq(jobCategories.categoryId, categoryId) : undefined,
      provinceId ? eq(jobsTable.provinceId, provinceId) : undefined,
      isOpen
        ? or(
          isNull(jobsTable.endDate),
          gt(jobsTable.endDate, convertDateToStr(new Date())),
        )
        : undefined,
    ];

    return conditions.filter(Boolean) as SQL<unknown>[];
  }

  async getSalaryStatisticsByExperience(filter: StatisticsJobFilter) {
    const { fromDate, toDate, categoryId, provinceId } = filter;

    const sqlChunks: SQL[] = [];

    sqlChunks.push(sql`
      SELECT 
        b.exp_year,
        AVG(j.salary_min) AS "avgSalaryMin",
        AVG(j.salary_max) AS "avgSalaryMax",
        COUNT(distinct j.id) AS "jobCount"
      FROM (
        SELECT generate_series(
          (SELECT COALESCE(MIN(experience_min), 0) FROM jobs),
          (SELECT COALESCE(MAX(experience_max), 20) FROM jobs)
        ) AS exp_year
      ) b
      INNER JOIN jobs j ON
          (j.experience_min IS NULL AND j.experience_max IS NULL)
          OR (j.experience_min IS NULL AND b.exp_year < j.experience_max)
          OR (j.experience_max IS NULL AND b.exp_year >= j.experience_min)
          OR (b.exp_year BETWEEN j.experience_min AND j.experience_max)
      LEFT JOIN job_categories jc ON j.id = jc.job_id
      `);

    const where: SQL[] = [
      sql`j.salary_min IS NOT NULL`,
      sql`j.salary_max IS NOT NULL`,
    ];
    if (fromDate) {
      where.push(sql`j.date_posted >= ${convertDateToStr(fromDate)}`);
    }
    if (toDate) {
      where.push(sql`j.date_posted <= ${convertDateToStr(toDate)}`);
    }
    if (categoryId) {
      where.push(sql`jc.category_id = ${categoryId}`);
    }
    if (provinceId) {
      where.push(sql`j.province_id = ${provinceId}`);
    }

    sqlChunks.push(sql`
      WHERE ${sql.join(where, sql` AND `)}
      GROUP BY b.exp_year
      ORDER BY b.exp_year DESC
    `);
    const result = await this.db.execute(sql.join(sqlChunks, sql` `));

    return result.rows.map((r: any) => ({
      expYear: Number(r.exp_year),
      avgSalaryMin: Number(r.avgSalaryMin),
      avgSalaryMax: Number(r.avgSalaryMax),
      jobCount: Number(r.jobCount),
    }));
  }
}

export class CategoryPostgresGenericRepository<TCategory, TTable>
  extends PostgresGenericRepository<TCategory, TTable>
  implements ICategoryGenericRepository<TCategory> {
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, categories as TTable);
  }

  async getCategories(): Promise<TCategory[]> {
    const result = (await this.db.select().from(categories)) as TCategory[];

    return result;
  }
}

export class UserExperiencePostgresGenericRepository<TUserExperience, TTable>
  extends PostgresGenericRepository<TUserExperience, TTable>
  implements IUserExperienceGenericRepository<TUserExperience> {
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, users as TTable);
  }

  async getByUserId(userId: number): Promise<TUserExperience[]> {
    const result = await this.db
      .select()
      .from(this._table as any)
      .where(eq((this._table as any).user_id, userId));
    return result as TUserExperience[];
  }

  async updateUserExperience(userId: number, id: string, item: UpdateUserExperienceDto): Promise<TUserExperience | null> {
    const result = await this.db
      .update(this._table as any)
      .set(item as {
        [key: string]: any;
      })
      .where(and(eq((this._table as any).id, id), eq((this._table as any).user_id, userId)))
      .returning();
    return (result[0] as TUserExperience) || null;
  }

  async deleteUserExperience(userId: number, id: string): Promise<TUserExperience | null> {
    const result = await this.db
      .delete(this._table as any)
      .where(and(eq((this._table as any).id, id), eq((this._table as any).user_id, userId)))
      .returning();
    return (result[0] as TUserExperience) || null;
  }

}

export class UserSkillPostgresGenericRepository<TUserSkill, TTable>
  extends PostgresGenericRepository<TUserSkill, TTable>
  implements IUserSkillGenericRepository<TUserSkill> {
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, userSkills as TTable);
  }

  async getByUserId(userId: number): Promise<TUserSkill[]> {
    const result = await this.db
      .select()
      .from(this._table as any)
      .where(eq((this._table as any).user_id, userId));
    return result as TUserSkill[];
  }

  async createUserSkill(userId: number, skillId: string): Promise<TUserSkill> {
    const result = await this.db
      .insert(this._table as any)
      .values({ user_id: userId, skill_id: skillId })
      .returning();
    return result[0] as TUserSkill;
  }

  async deleteUserSkill(userId: number, skillId: string): Promise<TUserSkill | null> {
    const result = await this.db
      .delete(this._table as any)
      .where(and(eq((this._table as any).user_id, userId), eq((this._table as any).skill_id, skillId)))
      .returning();
    return (result[0] as TUserSkill) || null;
  }

  async updateUserSkill(userId: number, skillId: string): Promise<TUserSkill | null> {
    const result = await this.db
      .update(this._table as any)
      .set({
        user_id: userId,
        skill_id: skillId,
      })
      .where(and(eq((this._table as any).user_id, userId), eq((this._table as any).skill_id, skillId)))
      .returning();
    return (result[0] as TUserSkill) || null;
  }
}