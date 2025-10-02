import {
  eq,
  and,
  gt,
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
  desc,
  SQLWrapper,
} from "drizzle-orm";
import { Inject, Injectable } from "@nestjs/common";
import {
  jobs,
  companies,
  skills,
  jobSkills,
  jobCategories,
  provinces,
} from "../models";
import { type DBDrizzle } from "@/frameworks/data-services/postgres/types";
import { convertDateToStr } from "@/common/utils/date";
import { GenericRepository } from "./generic-repository";
import { IJobRepository } from "@/core";
import {
  Job,
  Province,
  Skill,
  StatisticsJobFilter,
  Company,
} from "@/core/entities";

@Injectable()
export class JobRepository
  extends GenericRepository<Job, typeof jobs>
  implements IJobRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, jobs);
  }

  async getAllJobs(
    limit = 50,
    offset = 0,
    keyword = "",
    sortBy = "datePosted",
    sortDirection: "asc" | "desc" = "asc",
  ): Promise<
    { job: Job; provinces: Province[]; company: Company; skills: Skill[] }[]
  > {
    const sortColumn: SQLWrapper = jobs[sortBy];

    const orderExpr =
      sortDirection === "asc" ? asc(sortColumn) : desc(sortColumn);

    const result = (await this.db
      .select({
        job: jobs,
        provinces:
          sql`COALESCE(json_agg(${provinces}) FILTER (WHERE ${provinces}.id IS NOT NULL), '[]')`.as(
            "provinces",
          ),
        company: companies,
        skills:
          sql`COALESCE(json_agg(${skills}) FILTER (WHERE ${skills}.id IS NOT NULL), '[]')`.as(
            "skills",
          ),
      })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .leftJoin(provinces, eq(jobs.provinceId, provinces.id))
      .leftJoin(jobSkills, eq(jobs.id, jobSkills.jobId))
      .leftJoin(skills, eq(jobSkills.skillId, skills.id))
      .where(ilike(jobs.title, `%${keyword}%`))
      .groupBy(jobs.id, companies.id)
      .orderBy(orderExpr)
      .limit(limit)
      .offset(offset)) as {
      job: Job;
      provinces: Province[];
      company: Company;
      skills: Skill[];
    }[];

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
