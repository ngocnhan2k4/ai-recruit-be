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
  inArray,
  lt,
} from "drizzle-orm";
import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  jobs,
  companies,
  skills,
  jobSkills,
  categories,
  provinces,
  userInteractions,
  applyJobs,
  cvs,
  jobRaws,
  users,
  jobProvinces,
} from "../models";
import {
  DBDrizzleTransaction,
  type DBDrizzle,
} from "@/frameworks/data-services/postgres/types";
import { cacheWithDedup, convertDateToStr } from "@/common/utils";
import { GenericRepository } from "./generic-repository";
import {
  IJobRepository,
  INotificationRepository,
  IOrganizationRepository,
  JobStatusEnum,
  WorkTypeEnum,
  Notification,
  NotificationType,
  IUserRepository,
  Category,
  User,
  UserInteractionEnum,
  ApplyJob,
} from "@/core";
import {
  Job,
  Province,
  Skill,
  OrganizationWithDetails,
  ApplyStatusEnum,
} from "@/core";
import {
  ApplyJobResponse,
  UserInteractionResponse,
  JobAnswer,
  JobCounts,
  TopInMarketResponse,
  JobTrendTypeEnum,
  JobTrendsQuery,
  JobTrends,
} from "@/core";
import { PaginatedResult, GeneralQuery } from "@/common/types";
import { organizations } from "../models/organization.model";
import { JobFilters, JobResponse, StatisticsJobFilter } from "@/core";
import { getJobStatus } from "@/common/utils";
import { CACHE_KEYS, SHORT_TTL } from "@/common/constants/cache";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import type { Cache } from "cache-manager";
import { exists } from "drizzle-orm";

@Injectable()
export class JobRepository
  extends GenericRepository<Job, typeof jobs>
  implements IJobRepository
{
  private readonly logger = new Logger(JobRepository.name);

  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly notificationRepository: INotificationRepository,
    private readonly userRepository: IUserRepository,
  ) {
    super(db, jobs);
  }

  get(id: string): Promise<Job | null> {
    const key = CACHE_KEYS.job.get(id);
    return cacheWithDedup<Job | null>(
      key,
      () => this.cacheManager.get<Job | null>(key),
      () => super.get(id),
      (data: Job | null) =>
        this.cacheManager.set<Job | null>(key, data, SHORT_TTL),
      {
        logger: this.logger,
      },
    );
  }

  async update(
    where: Partial<Job>,
    item: Partial<Job>,
    tx?: DBDrizzleTransaction,
  ): Promise<Job[]> {
    const data = await super.update(where, item, tx);

    const keys: string[] = [];
    for (const job of data) {
      const keyGet = CACHE_KEYS.job.get(job.id);
      const keyGetWithDetail = CACHE_KEYS.job.getWithDetail(job.id);
      keys.push(keyGet, keyGetWithDetail);
    }
    await this.cacheManager
      .mdel(keys)
      .catch((err) =>
        this.logger.warn(
          `[cache] Failed to invalidate cache for Job ${keys.join(",")}:`,
          err,
        ),
      );
    return data;
  }

  async delete(where: Partial<Job>, tx?: DBDrizzleTransaction): Promise<Job[]> {
    const data = await super.delete(where, tx);

    const keys: string[] = [];
    for (const job of data) {
      const keyGet = CACHE_KEYS.job.get(job.id);
      const keyGetWithDetail = CACHE_KEYS.job.getWithDetail(job.id);
      keys.push(keyGet, keyGetWithDetail);
    }
    await this.cacheManager
      .mdel(keys)
      .catch((err) =>
        this.logger.warn(
          `[cache] Failed to invalidate cache for Job ${keys.join(",")}:`,
          err,
        ),
      );
    return data;
  }

  async getJobsByAdmin(
    filters: JobFilters,
  ): Promise<PaginatedResult<JobResponse>> {
    // Build where conditions
    const whereConditions: SQL[] = [];
    const { limit, page } = filters;
    if (filters?.keyword) {
      whereConditions.push(ilike(jobs.title, `%${filters.keyword}%`));
    }
    if (filters?.salaryMin !== undefined) {
      whereConditions.push(gte(jobs.salaryMin, filters.salaryMin.toString()));
    }

    if (filters?.salaryMax !== undefined) {
      whereConditions.push(lte(jobs.salaryMax, filters.salaryMax.toString()));
    }

    if (filters?.experienceMin !== undefined) {
      whereConditions.push(gte(jobs.experienceMin, filters.experienceMin));
    }

    if (filters?.experienceMax !== undefined) {
      whereConditions.push(lte(jobs.experienceMax, filters.experienceMax));
    }

    if (filters?.provinceId) {
      whereConditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${jobProvinces} jp 
          WHERE jp.job_id = ${jobs.id} 
          AND jp.province_id = ${filters.provinceId}
        )`,
      );
    }

    if (filters?.organizationId) {
      whereConditions.push(eq(jobs.organizationId, filters.organizationId));
    }

    if (filters?.workType) {
      whereConditions.push(eq(jobs.workType, filters.workType));
    }
    //apply status filter for only employer and admin
    if (filters?.status) {
      whereConditions.push(eq(jobs.status, filters.status));
    }

    if (filters?.createdAtStart) {
      whereConditions.push(gte(jobs.createdAt, filters.createdAtStart));
    }

    if (filters?.createdAtEnd) {
      whereConditions.push(lte(jobs.createdAt, filters.createdAtEnd));
    }

    if (filters?.isJobSystem) {
      whereConditions.push(isNull(jobs.jobRawId));
    }

    const offset = (Math.max(page || 1, 1) - 1) * limit;

    // Add one extra item to check if there's a next page
    const result = (await this.db
      .select({
        job: {
          ...jobs,
          applyUrl: sql`${jobRaws.url}`.as("applyUrl"),
        },
        organization: organizations,
        skills: sql`COALESCE(s_lateral.skills, '[]')`.as("skills"),
        provinces: sql`COALESCE(p_lateral.provinces, '[]')`.as("provinces"),
        category: categories,
      })
      .from(jobs)
      .leftJoin(jobRaws, eq(jobs.jobRawId, jobRaws.id))
      .innerJoin(organizations, eq(jobs.organizationId, organizations.id))
      .leftJoin(companies, eq(organizations.id, companies.organizationId))
      .leftJoin(
        sql`LATERAL (
          SELECT json_agg(p) AS provinces
          FROM ${jobProvinces} jp
          INNER JOIN ${provinces} p ON jp.province_id = p.id
          WHERE jp.job_id = ${jobs.id}
        ) p_lateral`,
        sql`TRUE`,
      )
      .leftJoin(
        sql`LATERAL (
          SELECT json_agg(s) AS skills
          FROM ${jobSkills} js
          INNER JOIN ${skills} s ON js.skill_id = s.id
          WHERE js.job_id = ${jobs.id}
        ) s_lateral`,
        sql`TRUE`,
      )
      .leftJoin(categories, eq(jobs.categoryId, categories.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(filters?.organizationId ? desc(jobs.datePosted) : asc(jobs.id))
      .offset(offset)
      .limit(limit)) as {
      job: Job;
      provinces: Province[];
      organization: OrganizationWithDetails;
      skills: Skill[];
      category: Category;
    }[];

    const total = (
      await this.db
        .select({
          total: countDistinct(jobs.id).as("total"),
        })
        .from(jobs)
        .leftJoin(categories, eq(jobs.categoryId, categories.id))
        .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
    )[0]?.total;

    return {
      data: result,
      pagination: {
        hasNextPage: result.length === limit,
        total,
      },
    };
  }

  async getJobs(filters: JobFilters): Promise<PaginatedResult<JobResponse>> {
    // Build where conditions
    const whereConditions: SQL[] = [];
    const { cursor, limit } = filters;
    if (filters?.keyword) {
      whereConditions.push(ilike(jobs.title, `%${filters.keyword}%`));
    }
    whereConditions.push(isNull(jobs.deletedAt));

    if (filters?.salaryMin !== undefined) {
      whereConditions.push(gte(jobs.salaryMin, filters.salaryMin.toString()));
    }

    if (filters?.salaryMax !== undefined) {
      whereConditions.push(lte(jobs.salaryMax, filters.salaryMax.toString()));
    }

    if (filters?.experienceMin !== undefined) {
      whereConditions.push(gte(jobs.experienceMin, filters.experienceMin));
    }

    if (filters?.experienceMax !== undefined) {
      whereConditions.push(lte(jobs.experienceMax, filters.experienceMax));
    }

    if (filters?.provinceId) {
      whereConditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${jobProvinces} jp 
          WHERE jp.job_id = ${jobs.id} 
          AND jp.province_id = ${filters.provinceId}
        )`,
      );
    }

    if (filters?.organizationId) {
      whereConditions.push(eq(jobs.organizationId, filters.organizationId));
    }

    if (filters?.companyId) {
      whereConditions.push(eq(jobs.organizationId, filters.companyId));
    }

    if (filters?.categoryId) {
      whereConditions.push(eq(jobs.categoryId, filters.categoryId));
    }

    if (filters?.workType) {
      whereConditions.push(eq(jobs.workType, filters.workType));
    }

    if (filters?.fromDate) {
      whereConditions.push(gte(jobs.createdAt, new Date(filters.fromDate)));
    }

    if (filters?.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59, 999);
      whereConditions.push(lte(jobs.createdAt, toDate));
    }

    if (filters?.skillIds?.length) {
      whereConditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${jobSkills} js 
          WHERE js.job_id = ${jobs.id} 
          AND js.skill_id IN (${sql.join(
            filters.skillIds.map((id) => sql`${id}`),
            sql`, `,
          )})
        )`,
      );
    }
    // [TODO] remove later
    // if (filters?.user?.userId) {
    //   whereConditions.push(
    //     sql`NOT EXISTS (
    //       SELECT 1 FROM ${userInteractions} ui
    //       WHERE ui.job_id = ${jobs.id}
    //       AND ui.user_id = ${filters.user?.userId}
    //       AND ui.type = 'hide'
    //     )`,
    //   );
    // }

    if (cursor) {
      // return empty array if user not logged in
      if (!filters?.user?.userId)
        return {
          data: [],
          pagination: { nextCursor: undefined, hasNextPage: false },
        };
      whereConditions.push(lt(jobs.createdAt, new Date(Number(cursor))));
    }

    // Add one extra item to check if there's a next page
    const result = (await this.db
      .select({
        job: {
          ...jobs,
          applyUrl: sql`${jobRaws.url}`.as("applyUrl"),
        },
        provinces: sql`COALESCE(p_lateral.provinces, '[]')`.as("provinces"),
        organization: organizations,
        skills: sql`COALESCE(s_lateral.skills, '[]')`.as("skills"),
        isSaved: filters?.user?.userId
          ? sql`EXISTS (
              SELECT 1 FROM ${userInteractions} ui 
              WHERE ui.job_id = ${jobs.id} 
              AND ui.user_id = ${filters.user?.userId} 
              AND ui.type = 'save'
            )`.as("isSaved")
          : sql`false`.as("isSaved"),
        isApplied: filters?.user?.userId
          ? sql`EXISTS (
              SELECT 1 FROM ${applyJobs} aj 
              INNER JOIN ${cvs} c ON aj.cv_id = c.id
              WHERE aj.job_id = ${jobs.id} 
              AND c.user_id = ${filters.user?.userId}
            )`.as("isApplied")
          : sql`false`.as("isApplied"),
        applyStatus: filters?.user?.userId
          ? sql`(
              SELECT aj.status FROM ${applyJobs} aj 
              INNER JOIN ${cvs} c ON aj.cv_id = c.id
              WHERE aj.job_id = ${jobs.id} 
              AND c.user_id = ${filters.user?.userId}
              LIMIT 1
            )`.as("applyStatus")
          : sql`NULL`.as("applyStatus"),
        applyId: filters?.user?.userId
          ? sql`(
              SELECT aj.id FROM ${applyJobs} aj 
              INNER JOIN ${cvs} c ON aj.cv_id = c.id
              WHERE aj.job_id = ${jobs.id} 
              AND c.user_id = ${filters.user?.userId}
              LIMIT 1
            )`.as("applyId")
          : sql`NULL`.as("applyId"),
        category: categories,
      })
      .from(jobs)
      .leftJoin(jobRaws, eq(jobs.jobRawId, jobRaws.id))
      .innerJoin(organizations, eq(jobs.organizationId, organizations.id))
      .leftJoin(companies, eq(organizations.id, companies.organizationId))
      .leftJoin(
        sql`LATERAL (
          SELECT json_agg(p) AS provinces
          FROM ${jobProvinces} jp
          INNER JOIN ${provinces} p ON jp.province_id = p.id
          WHERE jp.job_id = ${jobs.id}
        ) p_lateral`,
        sql`TRUE`,
      )
      .leftJoin(
        sql`LATERAL (
          SELECT json_agg(s) AS skills
          FROM ${jobSkills} js
          INNER JOIN ${skills} s ON js.skill_id = s.id
          WHERE js.job_id = ${jobs.id}
        ) s_lateral`,
        sql`TRUE`,
      )
      .leftJoin(categories, eq(jobs.categoryId, categories.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(
        filters?.organizationId ? desc(jobs.datePosted) : desc(jobs.createdAt),
      )
      .limit(limit + 1)) as {
      job: Job;
      provinces: Province[];
      organization: OrganizationWithDetails;
      skills: Skill[];
      category: Category;
    }[];

    // Check if there's a next page
    const hasNextPage = result.length > limit;
    const data = hasNextPage ? result.slice(0, limit) : result;

    // Next cursor is only applicable for cursor pagination
    // Use the last item from the sliced data, convert Date to timestamp
    const nextCursor =
      hasNextPage && data[data.length - 1]?.job?.createdAt
        ? data[data.length - 1].job.createdAt.getTime()
        : undefined;
    return {
      data,
      pagination: {
        nextCursor,
        hasNextPage,
      },
    };
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
      .where(and(...conditions));

    return result[0]?.totalJobs ?? 0;
  }

  async countByCategories(
    categoryIds: string[],
    filter: Omit<StatisticsJobFilter, "categoryId">,
  ): Promise<{ categoryId: string; count: number }[]> {
    if (categoryIds.length === 0) return [];

    const conditions = this.buildJobFilterQuery(filter);
    conditions.push(inArray(jobs.categoryId, categoryIds));

    const rows = await this.db
      .select({
        categoryId: jobs.categoryId,
        count: countDistinct(jobs.id).as("count"),
      })
      .from(jobs)
      .where(and(...conditions))
      .groupBy(jobs.categoryId);

    return rows.map((r) => ({
      categoryId: r.categoryId!,
      count: Number(r.count ?? 0),
    }));
  }

  async avgSalaryByCategories(
    categoryIds: string[],
    filter: Omit<StatisticsJobFilter, "categoryId">,
  ): Promise<{ categoryId: string; avgSalary: number }[]> {
    if (categoryIds.length === 0) return [];

    const conditions = this.buildJobFilterQuery(filter);
    conditions.push(
      inArray(jobs.categoryId, categoryIds),
      isNotNull(jobs.salaryMin),
      isNotNull(jobs.salaryMax),
    );

    const rows = await this.db
      .select({
        categoryId: jobs.categoryId,
        avgSalary:
          sql<number>`ROUND(AVG((${jobs.salaryMin}::numeric + ${jobs.salaryMax}::numeric) / 2), 1)`.as(
            "avg_salary",
          ),
      })
      .from(jobs)
      .where(and(...conditions))
      .groupBy(jobs.categoryId);

    return rows.map((r) => ({
      categoryId: r.categoryId!,
      avgSalary: Number(r.avgSalary ?? 0),
    }));
  }

  // --- Batch (multi-category) methods ---

  async getFrequentlyJobsByCategories(
    categoryIds: string[],
    filter: Omit<StatisticsJobFilter, "categoryId">,
  ): Promise<
    { categoryId: string; frequentlyJobs: { date: string; count: number }[] }[]
  > {
    if (categoryIds.length === 0) return [];

    const conditions = this.buildJobFilterQuery(filter);
    conditions.push(inArray(jobs.categoryId, categoryIds));

    const rows = await this.db
      .select({
        categoryId: jobs.categoryId,
        date: jobs.datePosted,
        count: countDistinct(jobs.id).as("count"),
      })
      .from(jobs)
      .where(and(...conditions))
      .groupBy(jobs.categoryId, jobs.datePosted);

    const map = new Map<string, { date: string; count: number }[]>();
    for (const r of rows) {
      const id = r.categoryId!;
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push({ date: r.date as string, count: Number(r.count) });
    }

    return categoryIds
      .filter((id) => map.has(id))
      .map((id) => ({ categoryId: id, frequentlyJobs: map.get(id)! }));
  }

  async getSalaryStatsByCategories(
    categoryIds: string[],
    filter: Omit<StatisticsJobFilter, "categoryId">,
  ): Promise<
    {
      categoryId: string;
      salaryStatistics: {
        expRange: string;
        avgSalaryMin: number;
        avgSalaryMax: number;
        jobCount: number;
      }[];
    }[]
  > {
    if (categoryIds.length === 0) return [];

    const { fromDate, toDate, provinceId } = filter;

    const where: SQL[] = [
      sql`j.salary_min IS NOT NULL`,
      sql`j.salary_max IS NOT NULL`,
      sql`j.category_id IN (${sql.join(
        categoryIds.map((id) => sql`${id}`),
        sql`, `,
      )})`,
    ];
    if (fromDate) {
      where.push(sql`j.date_posted >= ${convertDateToStr(fromDate)}`);
    }
    if (toDate) {
      where.push(sql`j.date_posted <= ${convertDateToStr(toDate)}`);
    }
    if (provinceId) {
      where.push(
        sql`EXISTS (
          SELECT 1 FROM ${jobProvinces} jp
          WHERE jp.job_id = j.id
          AND jp.province_id = ${provinceId}
        )`,
      );
    }

    const result = await this.db.execute(sql`
      SELECT
        s.category_id,
        s.exp_range,
        s.avg_salary_min,
        s.avg_salary_max,
        s.job_count
      FROM (
        SELECT
          j.category_id,
          CASE
            WHEN j.experience_min IS NULL AND j.experience_max IS NULL THEN 'Chưa yêu cầu'
            WHEN COALESCE(j.experience_min, 0) = 0 AND COALESCE(j.experience_max, 0) <= 1 THEN '0-1 năm'
            WHEN COALESCE(j.experience_min, 0) <= 1 AND COALESCE(j.experience_max, 1) <= 3 THEN '1-3 năm'
            WHEN COALESCE(j.experience_min, 0) <= 3 AND COALESCE(j.experience_max, 3) <= 5 THEN '3-5 năm'
            WHEN COALESCE(j.experience_min, 0) <= 5 AND COALESCE(j.experience_max, 5) <= 10 THEN '5-10 năm'
            ELSE '>10 năm'
          END AS exp_range,
          ROUND(AVG(j.salary_min)::numeric, 1) AS avg_salary_min,
          ROUND(AVG(j.salary_max)::numeric, 1) AS avg_salary_max,
          COUNT(DISTINCT j.id) AS job_count
        FROM jobs j
        WHERE ${sql.join(where, sql` AND `)}
        GROUP BY j.category_id, 2
      ) s
      ORDER BY
        s.category_id,
        CASE s.exp_range
          WHEN 'Chưa yêu cầu' THEN 0
          WHEN '0-1 năm' THEN 1
          WHEN '1-3 năm' THEN 2
          WHEN '3-5 năm' THEN 3
          WHEN '5-10 năm' THEN 4
          WHEN '>10 năm' THEN 5
        END
    `);

    const map = new Map<
      string,
      {
        expRange: string;
        avgSalaryMin: number;
        avgSalaryMax: number;
        jobCount: number;
      }[]
    >();
    for (const r of result.rows as any[]) {
      const id = String(r.category_id);
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push({
        expRange: String(r.exp_range),
        avgSalaryMin: Number(r.avg_salary_min),
        avgSalaryMax: Number(r.avg_salary_max),
        jobCount: Number(r.job_count),
      });
    }

    return categoryIds
      .filter((id) => map.has(id))
      .map((id) => ({ categoryId: id, salaryStatistics: map.get(id)! }));
  }

  async getTopAppliedJobsByCategories(
    categoryIds: string[],
    filter: Omit<StatisticsJobFilter, "categoryId">,
    limit = 10,
  ): Promise<{ categoryId: string; topAppliedJobs: TopInMarketResponse[] }[]> {
    if (categoryIds.length === 0) return [];

    const result = await this.db.execute(sql`
      SELECT * FROM (
        SELECT
          j.category_id,
          j.title AS name,
          COUNT(DISTINCT aj.id) AS count,
          ROW_NUMBER() OVER (PARTITION BY j.category_id ORDER BY COUNT(DISTINCT aj.id) DESC) AS rn
        FROM jobs j
        INNER JOIN ${applyJobs} aj ON aj.job_id = j.id
        WHERE j.category_id IN (${sql.join(
          categoryIds.map((id) => sql`${id}`),
          sql`, `,
        )})
          ${filter.fromDate ? sql`AND j.date_posted >= ${convertDateToStr(filter.fromDate)}` : sql``}
          ${filter.toDate ? sql`AND j.date_posted <= ${convertDateToStr(filter.toDate)}` : sql``}
          ${filter.provinceId ? sql`AND EXISTS (SELECT 1 FROM ${jobProvinces} jp WHERE jp.job_id = j.id AND jp.province_id = ${filter.provinceId})` : sql``}
        GROUP BY j.category_id, j.title
      ) sub
      WHERE sub.rn <= ${limit}
      ORDER BY sub.category_id, sub.rn
    `);

    const map = new Map<string, { name: string; count: number }[]>();
    for (const r of result.rows as any[]) {
      const id = String(r.category_id);
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push({ name: String(r.name), count: Number(r.count) });
    }

    return categoryIds
      .filter((id) => map.has(id))
      .map((id) => {
        const items = map.get(id)!;
        const total = items.reduce((s, i) => s + i.count, 0);
        return {
          categoryId: id,
          topAppliedJobs: items.map((i) => ({
            name: i.name,
            count: i.count,
            percentage: total > 0 ? Math.round((i.count / total) * 100) : 0,
          })),
        };
      });
  }

  async getTopEmployersByCategories(
    categoryIds: string[],
    filter: Omit<StatisticsJobFilter, "categoryId">,
    limit = 5,
  ): Promise<{ categoryId: string; topEmployers: TopInMarketResponse[] }[]> {
    if (categoryIds.length === 0) return [];

    const result = await this.db.execute(sql`
      SELECT * FROM (
        SELECT
          j.category_id,
          o.name,
          o.logo_url,
          COUNT(DISTINCT j.id) AS count,
          ROW_NUMBER() OVER (PARTITION BY j.category_id ORDER BY COUNT(DISTINCT j.id) DESC) AS rn
        FROM jobs j
        INNER JOIN ${organizations} o ON o.id = j.organization_id
        WHERE j.category_id IN (${sql.join(
          categoryIds.map((id) => sql`${id}`),
          sql`, `,
        )})
          AND o.name IS NOT NULL
          ${filter.fromDate ? sql`AND j.date_posted >= ${convertDateToStr(filter.fromDate)}` : sql``}
          ${filter.toDate ? sql`AND j.date_posted <= ${convertDateToStr(filter.toDate)}` : sql``}
          ${filter.provinceId ? sql`AND EXISTS (SELECT 1 FROM ${jobProvinces} jp WHERE jp.job_id = j.id AND jp.province_id = ${filter.provinceId})` : sql``}
        GROUP BY j.category_id, o.name, o.logo_url
      ) sub
      WHERE sub.rn <= ${limit}
      ORDER BY sub.category_id, sub.rn
    `);

    const map = new Map<
      string,
      { name: string; logoUrl: string | null; count: number }[]
    >();
    for (const r of result.rows as any[]) {
      const id = String(r.category_id);
      if (!map.has(id)) map.set(id, []);
      map.get(id)!.push({
        name: String(r.name),
        logoUrl: r.logo_url ? String(r.logo_url) : null,
        count: Number(r.count),
      });
    }

    return categoryIds
      .filter((id) => map.has(id))
      .map((id) => {
        const items = map.get(id)!;
        const total = items.reduce((s, i) => s + i.count, 0);
        return {
          categoryId: id,
          topEmployers: items.map((i) => ({
            name: i.name,
            logoUrl: i.logoUrl ?? undefined,
            count: i.count,
            percentage: total > 0 ? Math.round((i.count / total) * 100) : 0,
          })),
        };
      });
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
      categoryId ? eq(jobsTable.categoryId, categoryId) : undefined,
      provinceId
        ? sql`EXISTS (
            SELECT 1 FROM ${jobProvinces} jp 
            WHERE jp.job_id = ${jobsTable.id} 
            AND jp.province_id = ${provinceId}
          )`
        : undefined,
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

    const innerChunks: SQL[] = [];

    // Inner query: group by experience ranges
    innerChunks.push(sql`
      SELECT 
        CASE
          WHEN j.experience_min IS NULL AND j.experience_max IS NULL THEN 'Chưa yêu cầu'
          WHEN COALESCE(j.experience_min, 0) = 0 AND COALESCE(j.experience_max, 0) <= 1 THEN '0-1 năm'
          WHEN COALESCE(j.experience_min, 0) <= 1 AND COALESCE(j.experience_max, 1) <= 3 THEN '1-3 năm'
          WHEN COALESCE(j.experience_min, 0) <= 3 AND COALESCE(j.experience_max, 3) <= 5 THEN '3-5 năm'
          WHEN COALESCE(j.experience_min, 0) <= 5 AND COALESCE(j.experience_max, 5) <= 10 THEN '5-10 năm'
          ELSE '>10 năm'
        END AS exp_range,
        ROUND(AVG(j.salary_min)::numeric, 1) AS avg_salary_min,
        ROUND(AVG(j.salary_max)::numeric, 1) AS avg_salary_max,
        COUNT(DISTINCT j.id) AS job_count
      FROM jobs j
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
      where.push(sql`j.category_id = ${categoryId}`);
    }
    if (provinceId) {
      where.push(
        sql`EXISTS (
          SELECT 1 FROM ${jobProvinces} jp 
          WHERE jp.job_id = j.id 
          AND jp.province_id = ${provinceId}
        )`,
      );
    }

    innerChunks.push(sql`
      WHERE ${sql.join(where, sql` AND `)}
      GROUP BY 1
    `);

    // Wrap in outer query so we can reference the alias in ORDER BY
    const result = await this.db.execute(sql`
      SELECT s.exp_range, s.avg_salary_min, s.avg_salary_max, s.job_count
      FROM (${sql.join(innerChunks, sql` `)}) s
      ORDER BY
        CASE s.exp_range
          WHEN 'Chưa yêu cầu' THEN 0
          WHEN '0-1 năm' THEN 1
          WHEN '1-3 năm' THEN 2
          WHEN '3-5 năm' THEN 3
          WHEN '5-10 năm' THEN 4
          WHEN '>10 năm' THEN 5
        END
    `);

    return result.rows.map((r: any) => ({
      expRange: String(r.exp_range),
      avgSalaryMin: Number(r.avg_salary_min),
      avgSalaryMax: Number(r.avg_salary_max),
      jobCount: Number(r.job_count),
    }));
  }

  async getTopAppliedJobs(
    filter: StatisticsJobFilter,
    limit = 10,
  ): Promise<TopInMarketResponse[]> {
    const conditions = this.buildJobFilterQuery(filter);

    const result = await this.db
      .select({
        term: jobs.title,
        count: countDistinct(applyJobs.id).as("count"),
      })
      .from(jobs)
      .leftJoin(applyJobs, eq(jobs.id, applyJobs.jobId))
      .where(and(...conditions, isNotNull(applyJobs.id)))
      .groupBy(jobs.title)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    const totalApplications = result.reduce(
      (sum, item) => sum + Number(item.count),
      0,
    );

    return result.map((item) => ({
      name: item.term,
      count: Number(item.count),
      percentage:
        totalApplications > 0
          ? Math.round((Number(item.count) / totalApplications) * 100)
          : 0,
    }));
  }

  async getTopEmployers(
    filter: StatisticsJobFilter,
    limit = 10,
  ): Promise<TopInMarketResponse[]> {
    const conditions = this.buildJobFilterQuery(filter);

    const result = await this.db
      .select({
        id: organizations.id,
        name: organizations.name,
        logoUrl: organizations.logoUrl,
        count: countDistinct(jobs.id).as("count"),
      })
      .from(jobs)
      .leftJoin(organizations, eq(jobs.organizationId, organizations.id))
      .where(and(...conditions, isNotNull(organizations.name)))
      .groupBy(organizations.id, organizations.name, organizations.logoUrl)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    const totalJobs = result.reduce((sum, item) => sum + Number(item.count), 0);

    return result.map((item) => ({
      id: item.id!,
      name: item.name!,
      logoUrl: item.logoUrl!,
      percentage:
        totalJobs > 0 ? Math.round((Number(item.count) / totalJobs) * 100) : 0,
      count: Number(item.count),
    }));
  }

  async getTopCategories(
    filter: StatisticsJobFilter,
    limit = 10,
  ): Promise<TopInMarketResponse[]> {
    const conditions = this.buildJobFilterQuery({
      ...filter,
      categoryId: undefined,
    });

    const result = await this.db
      .select({
        id: categories.id,
        name: categories.name,
        count: countDistinct(jobs.id).as("count"),
      })
      .from(jobs)
      .leftJoin(categories, eq(jobs.categoryId, categories.id))
      .where(and(...conditions, isNotNull(categories.name)))
      .groupBy(categories.id, categories.name)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    const totalJobsWithCategories = result.reduce(
      (sum, item) => sum + Number(item.count),
      0,
    );

    return result.map((item) => ({
      id: item.id!,
      name: item.name!,
      count: Number(item.count),
      percentage:
        totalJobsWithCategories > 0
          ? Math.round((Number(item.count) / totalJobsWithCategories) * 100)
          : 0,
    }));
  }

  async getJobCounts(): Promise<JobCounts> {
    // grouped counts by status excluding deleted jobs
    const grouped = await this.db
      .select({
        status: jobs.status,
        count: countDistinct(jobs.id).as("count"),
      })
      .from(jobs)
      .where(isNull(jobs.deletedAt))
      .groupBy(jobs.status);

    const totalRes = await this.db
      .select({ total: countDistinct(jobs.id).as("total") })
      .from(jobs)
      .where(isNull(jobs.deletedAt));

    const total = Number(totalRes[0]?.total ?? 0);

    return {
      total,
      byStatus: grouped.map((r: any) => ({
        status: r.status,
        count: Number(r.count ?? 0),
      })),
    };
  }

  /**
   * Apply for a job. If `sendNotifications` is true AND `senderUserId` is provided,
   * this will create notifications for the job's organization members.
   */
  async applyJob({
    jobId,
    userCvId,
    sendNotifications = false,
    senderUserId,
    answers,
  }: {
    jobId: string;
    userCvId: string;
    sendNotifications?: boolean;
    senderUserId: string;
    answers?: JobAnswer[];
  }): Promise<
    | ApplyJobResponse
    | {
        application: ApplyJobResponse;
        notifications: Notification[];
        jobTitle?: string;
      }
  > {
    const result = await this.db.transaction(async (tx) => {
      const [existingApplication] = await tx
        .select({
          exists: exists(
            tx
              .select()
              .from(applyJobs)
              .innerJoin(cvs, eq(applyJobs.cvId, cvs.id))
              .where(
                and(eq(cvs.userId, senderUserId), eq(applyJobs.jobId, jobId)),
              ),
          ),
        })
        .from(applyJobs);

      if (existingApplication.exists) {
        throw new Error("User has already applied for this job");
      }

      // Insert application
      const [newApplication] = await tx
        .insert(applyJobs)
        .values({
          jobId,
          cvId: userCvId,
          answers,
          status: ApplyStatusEnum.PENDING,
        })
        .returning();

      // Update CV.lastUsed
      await tx
        .update(cvs)
        .set({ lastUsed: new Date() })
        .where(eq(cvs.id, userCvId));

      // If notifications not requested or no senderUserId, just return application
      if (!sendNotifications || !senderUserId) {
        return newApplication as ApplyJobResponse;
      }

      const jobInfo = await tx
        .select({ title: jobs.title, organizationId: jobs.organizationId })
        .from(jobs)
        .where(eq(jobs.id, jobId))
        .limit(1);

      if (jobInfo.length === 0) {
        throw new Error("Job not found");
      }

      const { title: jobTitle, organizationId } = jobInfo[0];

      const adminUsers =
        await this.organizationRepository.getMemberIdsOfOrganization(
          organizationId,
        );

      const recipients = adminUsers.map((m) => ({
        receiverId: m.id,
        organizationId,
      }));

      const notifications =
        await this.notificationRepository.preCreateNotifications(
          tx,
          {
            title: "Đơn ứng tuyển mới",
            message: `Có một đơn ứng tuyển mới cho vị trí "${jobTitle}"`,
            type: NotificationType.JOB_APPLIED,
            senderId: senderUserId,
            payload: {
              jobId,
              applyId: newApplication.id,
              orgId: organizationId,
            },
          },
          recipients,
        );

      return {
        application: newApplication as ApplyJobResponse,
        notifications,
        jobTitle,
      };
    });

    return result;
  }

  async updateApplyJob(
    applyId: string,
    status: ApplyStatusEnum,
    sendNotifications = false,
    senderUserId?: string,
    userCvId?: string,
    answers?: JobAnswer[],
  ): Promise<
    | ApplyJobResponse
    | {
        application: ApplyJobResponse;
        notification: Notification;
        jobTitle: string;
      }
  > {
    const result = await this.db.transaction(async (tx) => {
      // Get existing application with job info
      const existingApp = await tx
        .select({
          application: applyJobs,
          userId: cvs.userId,
          jobTitle: jobs.title,
          jobId: jobs.id,
          organizationId: jobs.organizationId,
        })
        .from(applyJobs)
        .innerJoin(cvs, eq(applyJobs.cvId, cvs.id))
        .innerJoin(jobs, eq(applyJobs.jobId, jobs.id))
        .where(eq(applyJobs.id, applyId))
        .limit(1);

      if (existingApp.length === 0) {
        throw new Error("Application not found");
      }

      const { userId, jobTitle, jobId, organizationId } = existingApp[0];

      // Update the application
      const [updatedApplication] = await tx
        .update(applyJobs)
        .set({
          status: status || existingApp[0].application.status,
          cvId: userCvId || existingApp[0].application.cvId,
          answers: answers || existingApp[0].application.answers,
          updatedAt: new Date(),
        })
        .where(eq(applyJobs.id, applyId))
        .returning();

      let notification: Notification | null = null;

      if (
        status &&
        status !== existingApp[0].application.status &&
        sendNotifications &&
        senderUserId
      ) {
        const notificationTitle =
          status == ApplyStatusEnum.ACCEPTED
            ? "Đơn ứng tuyển được chấp nhận"
            : "Đơn ứng tuyển bị từ chối";
        const notificationMessage = `Đơn ứng tuyển của bạn cho vị trí "${jobTitle}" đã được ${status == ApplyStatusEnum.ACCEPTED ? "chấp nhận" : "từ chối"}`;

        const notifications =
          await this.notificationRepository.preCreateNotifications(
            tx,
            {
              title: notificationTitle,
              message: notificationMessage,
              type:
                status == ApplyStatusEnum.ACCEPTED
                  ? NotificationType.CV_APPROVED
                  : NotificationType.CV_REJECTED,
              senderId: senderUserId,
              payload: {
                jobId: jobId,
                applyId: applyId,
                orgId: organizationId,
              },
            },
            [{ receiverId: userId, organizationId }],
          );

        notification = notifications[0] || null;
      }

      if (notification) {
        return {
          application: updatedApplication as ApplyJobResponse,
          notification,
          jobTitle,
        };
      } else {
        return updatedApplication as ApplyJobResponse;
      }
    });

    return result;
  }

  async getApplyJobById(applyId: string): Promise<ApplyJobResponse | null> {
    const result = await this.db
      .select()
      .from(applyJobs)
      .where(eq(applyJobs.id, applyId))
      .limit(1);

    return result[0] as ApplyJobResponse | null;
  }

  async getApplyJobs(jobId: string): Promise<ApplyJobResponse[]> {
    const result = await this.db
      .select({
        id: applyJobs.id,
        jobId: applyJobs.jobId,
        cvId: applyJobs.cvId,
        status: applyJobs.status,
        answers: applyJobs.answers,
        createdAt: applyJobs.createdAt,
        updatedAt: applyJobs.updatedAt,
        userId: cvs.userId,
      })
      .from(applyJobs)
      .innerJoin(cvs, eq(applyJobs.cvId, cvs.id))
      .where(eq(applyJobs.jobId, jobId))
      .orderBy(desc(applyJobs.createdAt));

    return result as ApplyJobResponse[];
  }

  async saveJob(
    userId: string,
    jobId: string,
    save: boolean,
  ): Promise<UserInteractionResponse | null> {
    // Check if user already has a save interaction for this job
    const existingInteraction = await this.db
      .select()
      .from(userInteractions)
      .where(
        and(
          eq(userInteractions.userId, userId),
          eq(userInteractions.jobId, jobId),
          eq(userInteractions.type, "save"),
        ),
      )
      .limit(1);

    if (save) {
      // User wants to save the job
      if (existingInteraction.length > 0) {
        // Job already saved, return existing interaction
        return existingInteraction[0] as UserInteractionResponse;
      }

      // Create new save interaction
      const [newInteraction] = await this.db
        .insert(userInteractions)
        .values({
          userId,
          jobId,
          type: "save",
        })
        .returning();

      return newInteraction as UserInteractionResponse;
    } else {
      // User wants to unsave the job
      if (existingInteraction.length > 0) {
        // Delete the existing interaction
        await this.db
          .delete(userInteractions)
          .where(
            and(
              eq(userInteractions.userId, userId),
              eq(userInteractions.jobId, jobId),
              eq(userInteractions.type, "save"),
            ),
          );
      }
      return null; // No interaction exists after unsaving
    }
  }
  // [TODO] remove later
  // async hideJob(
  //   userId: string,
  //   jobId: string,
  //   hide: boolean,
  // ): Promise<UserInteractionResponse | null> {
  //   // Check if user already has a hide interaction for this job
  //   const existingInteraction = await this.db
  //     .select()
  //     .from(userInteractions)
  //     .where(
  //       and(
  //         eq(userInteractions.userId, userId),
  //         eq(userInteractions.jobId, jobId),
  //         eq(userInteractions.type, "hide"),
  //       ),
  //     )
  //     .limit(1);

  //   if (hide) {
  //     // User wants to hide the job
  //     if (existingInteraction.length > 0) {
  //       // Job already hidden, return existing interaction
  //       return existingInteraction[0] as UserInteractionResponse;
  //     }

  //     // Create new hide interaction
  //     const [newInteraction] = await this.db
  //       .insert(userInteractions)
  //       .values({
  //         userId,
  //         jobId,
  //         type: "hide",
  //       })
  //       .returning();

  //     return newInteraction as UserInteractionResponse;
  //   } else {
  //     // User wants to unhide the job
  //     if (existingInteraction.length > 0) {
  //       // Delete the existing interaction
  //       await this.db
  //         .delete(userInteractions)
  //         .where(
  //           and(
  //             eq(userInteractions.userId, userId),
  //             eq(userInteractions.jobId, jobId),
  //             eq(userInteractions.type, "hide"),
  //           ),
  //         );
  //     }
  //     return null; // No interaction exists after unhiding
  //   }
  // }

  async createJob(
    job: Partial<Job> & {
      skillIds?: string[];
      skillNames?: string[];
      provinceIds?: string[];
    },
    sendNotifications = false,
    senderUserId?: string,
  ): Promise<
    | Job
    | {
        job: Job;
        newNotifications: Notification[];
      }
  > {
    const jobData = {
      title: job.title!,
      organizationId: job.organizationId!,
      categoryId: job.categoryId!,
      description: job.description,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      experienceMin: job.experienceMin,
      experienceMax: job.experienceMax,
      datePosted: job.datePosted,
      endDate: job.endDate,
      workType: job.workType,
      jobRawId: job.jobRawId,
      questions: job.questions,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await this.db.transaction(async (tx) => {
      const [newJob] = await tx.insert(jobs).values(jobData).returning();

      // Handle skill associations: resolve skillNames to IDs, then combine with existing skillIds
      const allSkillIds = [...(job.skillIds ?? [])];
      if (job.skillNames && job.skillNames.length > 0) {
        const newSkills = await tx
          .insert(skills)
          .values(job.skillNames.map((name) => ({ name })))
          .returning();
        allSkillIds.push(...newSkills.map((s) => s.id));
      }
      if (allSkillIds.length > 0) {
        const skillAssociations = allSkillIds.map((skillId) => ({
          jobId: newJob.id,
          skillId,
        }));
        await tx.insert(jobSkills).values(skillAssociations);
      }

      // Handle province associations
      const provinceIds = (
        job.provinceIds ??
        (job.provinceIds !== undefined ? job.provinceIds : [])
      ).filter((id): id is string => Boolean(id));
      if (provinceIds.length > 0) {
        const provinceAssociations = provinceIds.map((provinceId) => ({
          jobId: newJob.id,
          provinceId,
        }));
        await tx.insert(jobProvinces).values(provinceAssociations);
      }

      // If notifications not requested or no senderUserId, just return job
      if (!sendNotifications || !senderUserId) {
        return newJob as Job;
      }

      // Get all admin members to notify
      const adminUsers = await this.userRepository.getAllAdminUsers({
        page: 1,
        limit: 100, // Send notifications limit only 100 admin users
        isActive: true,
        isDeleted: false,
      });

      const recipients = adminUsers.data.map((m) => ({
        receiverId: m.id,
      }));

      const notifications =
        await this.notificationRepository.preCreateNotifications(
          tx,
          {
            title: "Công việc mới được tạo",
            message: `Công việc "${newJob.title}" đã được tạo và đang chờ phê duyệt.`,
            type: NotificationType.JOB_POSTED,
            senderId: senderUserId,
            payload: {
              jobId: newJob.id,
              orgId: newJob.organizationId,
            },
          },
          recipients,
        );

      return { job: newJob as Job, newNotifications: notifications };
    });

    return result;
  }

  async updateJob(
    jobId: string,
    job: Partial<Job> & {
      skillIds?: string[];
      skillNames?: string[];
      provinceIds?: string[];
    },
  ): Promise<Job | null> {
    return this.db.transaction(async (tx) => {
      return this.preUpdateJob(tx, jobId, job);
    });
  }

  async preUpdateJob(
    tx: DBDrizzleTransaction,
    jobId: string,
    job: Partial<Job> & {
      skillIds?: string[];
      skillNames?: string[];
      provinceIds?: string[];
    },
  ): Promise<Job | null> {
    const [updatedJob] = await tx
      .update(jobs)
      .set({
        ...job,
      })
      .where(eq(jobs.id, jobId))
      .returning();

    if (job.skillIds !== undefined || job.skillNames !== undefined) {
      await tx.delete(jobSkills).where(eq(jobSkills.jobId, jobId));

      const allSkillIds = [...(job.skillIds ?? [])];
      if (job.skillNames && job.skillNames.length > 0) {
        const newSkills = await tx
          .insert(skills)
          .values(job.skillNames.map((name) => ({ name })))
          .returning();
        allSkillIds.push(...newSkills.map((s) => s.id));
      }
      if (allSkillIds.length > 0) {
        const skillAssociations = allSkillIds.map((skillId) => ({
          jobId: jobId,
          skillId,
        }));

        await tx.insert(jobSkills).values(skillAssociations);
      }
    }

    if (job.provinceIds !== undefined) {
      await tx.delete(jobProvinces).where(eq(jobProvinces.jobId, jobId));
      const filteredProvinceIds: string[] = job.provinceIds.filter(
        (id): id is string => Boolean(id),
      );
      if (filteredProvinceIds.length > 0) {
        const provinceAssociations = filteredProvinceIds.map((provinceId) => ({
          jobId,
          provinceId,
        }));
        await tx.insert(jobProvinces).values(provinceAssociations);
      }
    }

    await this.cacheManager
      .del(CACHE_KEYS.job.get(jobId))
      .catch((err) =>
        this.logger.warn(
          `[cache] Failed to invalidate cache for job ${jobId}:`,
          err,
        ),
      );
    return updatedJob as Job | null;
  }

  async updateJobWithNotifications(
    jobId: string,
    job: Partial<Job> & {
      skillIds?: string[];
      skillNames?: string[];
      provinceIds?: string[];
    },
    userId: string,
  ): Promise<{ job: Job | null; newNotifications: Notification[] }> {
    const result = await this.db.transaction(async (tx) => {
      const [updatedJob] = await tx
        .update(jobs)
        .set({
          ...job,
        })
        .where(eq(jobs.id, jobId))
        .returning();

      if (!updatedJob) {
        return { job: null, newNotifications: [] };
      }

      if (job.skillIds !== undefined || job.skillNames !== undefined) {
        // Remove existing skill associations
        await tx.delete(jobSkills).where(eq(jobSkills.jobId, jobId));

        // Resolve skillNames to IDs, then combine with existing skillIds
        const allSkillIds = [...(job.skillIds ?? [])];
        if (job.skillNames && job.skillNames.length > 0) {
          const newSkills = await tx
            .insert(skills)
            .values(job.skillNames.map((name) => ({ name })))
            .returning();
          allSkillIds.push(...newSkills.map((s) => s.id));
        }
        if (allSkillIds.length > 0) {
          const skillAssociations = allSkillIds.map((skillId) => ({
            jobId: jobId,
            skillId: skillId,
          }));
          await tx.insert(jobSkills).values(skillAssociations);
        }
      }
      if (job.provinceIds && job.provinceIds.length > 0) {
        await tx.delete(jobProvinces).where(eq(jobProvinces.jobId, jobId));

        if (job.provinceIds.length > 0) {
          const provinceAssociations = job.provinceIds.map((provinceId) => ({
            jobId,
            provinceId,
          }));
          await tx.insert(jobProvinces).values(provinceAssociations);
        }
      }

      // Get all organization members to notify
      const orgUsers =
        await this.organizationRepository.getMemberIdsOfOrganization(
          updatedJob.organizationId,
        );

      if (orgUsers.length === 0) {
        return { job: updatedJob as Job, newNotifications: [] };
      }
      const recipients = orgUsers.map((ou) => {
        return { receiverId: ou.id, organizationId: updatedJob.organizationId };
      });
      const notifications =
        await this.notificationRepository.preCreateNotifications(
          tx,
          {
            title: "Cập nhật trạng thái công việc",
            message: `Công việc "${updatedJob.title}" đã ${getJobStatus(updatedJob.status as JobStatusEnum)} bởi quản trị viên.`,
            type:
              (updatedJob.status as JobStatusEnum) === JobStatusEnum.ACTIVE
                ? NotificationType.ADMIN_JOB_APPROVED
                : NotificationType.ADMIN_JOB_REJECTED,
            senderId: userId,
            payload: {
              jobId: updatedJob.id,
              orgId: updatedJob.organizationId,
            },
          },
          recipients,
        );

      await this.cacheManager
        .del(CACHE_KEYS.job.get(jobId))
        .catch((err) =>
          this.logger.warn(
            `[cache] Failed to invalidate cache for job ${jobId}:`,
            err,
          ),
        );

      return { job: updatedJob as Job, newNotifications: notifications };
    });
    return result;
  }

  async deleteJob(jobId: string): Promise<boolean> {
    const result = await this.db
      .update(jobs)
      .set({
        deletedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
      .returning();

    await this.cacheManager
      .del(CACHE_KEYS.job.get(jobId))
      .catch((err) =>
        this.logger.warn(
          `[cache] Failed to invalidate cache for job ${jobId}:`,
          err,
        ),
      );

    return result.length > 0;
  }

  async getAllSavedJobs(
    userId: string,
    query: GeneralQuery,
  ): Promise<
    PaginatedResult<{
      id: string;
      title: string;
      salaryMin: string | null;
      salaryMax: string | null;
      companyName: string;
      logoUrl: string | null;
      workType: WorkTypeEnum;
      createdAt: Date;
      endedAt: string | null;
      provinceNames: string[];
      isApplied: boolean;
    }>
  > {
    query.limit = query.limit ?? 10;
    query.page = query.page ?? 1;
    const offset = (query.page - 1) * query.limit;
    const result = await this.db
      .select({
        id: jobs.id,
        title: jobs.title,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        companyName: organizations.name,
        logoUrl: organizations.logoUrl,
        workType: jobs.workType,
        createdAt: jobs.createdAt,
        endedAt: jobs.endDate,
        provinceNames: sql`(
          SELECT json_agg(p.name) 
          FROM ${jobProvinces} jp 
          INNER JOIN ${provinces} p ON jp.province_id = p.id 
          WHERE jp.job_id = ${jobs.id}
        )`.as("provinceNames"),
        applyJobId: applyJobs.id,
      })
      .from(userInteractions)
      .innerJoin(jobs, eq(userInteractions.jobId, jobs.id))
      .innerJoin(organizations, eq(jobs.organizationId, organizations.id))
      .leftJoin(applyJobs, eq(applyJobs.jobId, jobs.id))
      .leftJoin(cvs, and(eq(applyJobs.cvId, cvs.id), eq(cvs.userId, userId)))
      .where(
        and(
          eq(userInteractions.userId, userId),
          eq(userInteractions.type, "save"),
          isNull(jobs.deletedAt),
        ),
      )
      .orderBy(
        query.sortDirection === "desc"
          ? desc(jobs.createdAt)
          : asc(jobs.createdAt),
      )
      .offset(offset)
      .limit(query.limit + 1);

    const hasNextPage = result.length > query.limit;
    const data = hasNextPage ? result.slice(0, query.limit) : result;
    const total = await this.getNumberOfSavedJobs(userId);

    return {
      data: data.map((item) => ({
        ...item,
        workType: item.workType as WorkTypeEnum,
        isApplied: item.applyJobId ? true : false,
        provinceNames: (item.provinceNames as string[]) || [],
      })),
      pagination: {
        hasNextPage,
        total: total,
      },
    };
  }
  async getFullJobById(
    jobId: string,
    userId?: string,
  ): Promise<JobResponse | null> {
    // Create query to get job information and relations
    const key = CACHE_KEYS.job.getWithDetail(jobId);
    return cacheWithDedup(
      key,
      () => this.cacheManager.get<JobResponse | null>(key),
      async () => {
        const result = await this.db
          .select({
            job: jobs,
            provinces: sql`COALESCE(p_lateral.provinces, '[]')`.as("provinces"),
            organization: organizations,
            skills: sql`COALESCE(s_lateral.skills, '[]')`.as("skills"),
            // If user is authenticated, check if job is saved or applied
            isSaved: userId
              ? sql`EXISTS (
            SELECT 1 FROM ${userInteractions} ui 
            WHERE ui.job_id = ${jobs.id} 
            AND ui.user_id = ${userId} 
            AND ui.type = 'save'
          )`.as("isSaved")
              : sql`false`.as("isSaved"),
            isApplied: userId
              ? sql`EXISTS (
            SELECT 1 FROM ${applyJobs} aj 
            INNER JOIN ${cvs} c ON aj.cv_id = c.id
            WHERE aj.job_id = ${jobs.id} 
            AND c.user_id = ${userId}
          )`.as("isApplied")
              : sql`false`.as("isApplied"),
            applyStatus: userId
              ? sql`(
            SELECT aj.status FROM ${applyJobs} aj 
            INNER JOIN ${cvs} c ON aj.cv_id = c.id
            WHERE aj.job_id = ${jobs.id} 
            AND c.user_id = ${userId}
            LIMIT 1
          )`.as("applyStatus")
              : sql`NULL`.as("applyStatus"),
            applyId: userId
              ? sql`(
            SELECT aj.id FROM ${applyJobs} aj 
            INNER JOIN ${cvs} c ON aj.cv_id = c.id
            WHERE aj.job_id = ${jobs.id} 
            AND c.user_id = ${userId}
            LIMIT 1
          )`.as("applyId")
              : sql`NULL`.as("applyId"),
            category: categories,
          })
          .from(jobs)
          .innerJoin(organizations, eq(jobs.organizationId, organizations.id))
          .leftJoin(
            sql`LATERAL (
          SELECT json_agg(p) AS provinces
          FROM ${jobProvinces} jp
          INNER JOIN ${provinces} p ON jp.province_id = p.id
          WHERE jp.job_id = ${jobs.id}
        ) p_lateral`,
            sql`TRUE`,
          )
          .leftJoin(
            sql`LATERAL (
          SELECT json_agg(s) AS skills
          FROM ${jobSkills} js
          INNER JOIN ${skills} s ON js.skill_id = s.id
          WHERE js.job_id = ${jobs.id}
        ) s_lateral`,
            sql`TRUE`,
          )
          .leftJoin(categories, eq(jobs.categoryId, categories.id))
          .where(and(eq(jobs.id, jobId), isNull(jobs.deletedAt)))
          .limit(1);

        if (!result || result.length === 0) {
          return null;
        }

        // get data from result
        const data = result[0];

        return {
          job: data.job as Job,
          provinces: data.provinces as Province[],
          organization: data.organization as OrganizationWithDetails,
          skills: data.skills as Skill[],
          isSaved: (data.isSaved || undefined) as boolean | undefined,
          isApplied: (data.isApplied || undefined) as boolean | undefined,
          applyStatus: (data.applyStatus || undefined) as string | undefined,
          applyId: (data.applyId || undefined) as string | undefined,
          category: data.category as Category,
        };
      },
      (data: JobResponse | null) => this.cacheManager.set(key, data, SHORT_TTL),
      {
        logger: this.logger,
      },
    );
  }
  async getNumberOfSavedJobs(userId: string): Promise<number> {
    const result = await this.db
      .select({
        count: sql`COUNT(*)`.as("count"),
      })
      .from(userInteractions)
      .innerJoin(jobs, eq(userInteractions.jobId, jobs.id))
      .where(
        and(
          eq(userInteractions.userId, userId),
          eq(userInteractions.type, "save"),
          isNull(jobs.deletedAt),
        ),
      );
    return Number(result[0]?.count ?? 0);
  }
  async getNumberOfAppliedJobs(userId: string): Promise<number> {
    const result = await this.db
      .select({
        count: sql`COUNT(*)`.as("count"),
      })
      .from(applyJobs)
      .innerJoin(cvs, eq(applyJobs.cvId, cvs.id))
      .innerJoin(jobs, eq(applyJobs.jobId, jobs.id))
      .where(and(eq(cvs.userId, userId), isNull(jobs.deletedAt)));
    return Number(result[0]?.count ?? 0);
  }
  async getAllAppliedJobs(
    userId: string,
    query: GeneralQuery,
  ): Promise<
    PaginatedResult<{
      id: string;
      title: string;
      salaryMin: string | null;
      salaryMax: string | null;
      companyName: string;
      logoUrl: string | null;
      workType: WorkTypeEnum;
      createdAt: Date;
      endedAt: string | null;
      provinceNames: string[];
      isApplied: boolean;
      applyStatus: ApplyStatusEnum;
    }>
  > {
    query.limit = query.limit ?? 10;
    query.page = query.page ?? 1;
    const offset = (query.page - 1) * query.limit;
    const result = await this.db
      .select({
        id: jobs.id,
        title: jobs.title,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        companyName: organizations.name,
        logoUrl: organizations.logoUrl,
        workType: jobs.workType,
        createdAt: jobs.createdAt,
        endedAt: jobs.endDate,
        provinceNames: sql`(
          SELECT json_agg(p.name) 
          FROM ${jobProvinces} jp 
          INNER JOIN ${provinces} p ON jp.province_id = p.id 
          WHERE jp.job_id = ${jobs.id} 
        )`.as("provinceNames"),
        applyJobId: applyJobs.id,
        applyStatus: applyJobs.status,
      })
      .from(applyJobs)
      .innerJoin(cvs, eq(applyJobs.cvId, cvs.id))
      .innerJoin(jobs, eq(applyJobs.jobId, jobs.id))
      .innerJoin(organizations, eq(jobs.organizationId, organizations.id))
      .where(and(eq(cvs.userId, userId), isNull(jobs.deletedAt)))
      .orderBy(
        query.sortDirection === "desc"
          ? desc(jobs.createdAt)
          : asc(jobs.createdAt),
      )
      .offset(offset)
      .limit(query.limit + 1);

    const hasNextPage = result.length > query.limit;
    const data = hasNextPage ? result.slice(0, query.limit) : result;
    const total = await this.getNumberOfAppliedJobs(userId);

    return {
      data: data.map((item) => ({
        ...item,
        isApplied: item.applyJobId ? true : false,
        workType: item.workType as WorkTypeEnum,
        applyStatus: item.applyStatus as ApplyStatusEnum,
        provinceNames: (item.provinceNames as string[]) || [],
      })),
      pagination: {
        hasNextPage,
        total: total,
      },
    };
  }

  async getUsersWithAppliedJobs(): Promise<
    Array<{
      userId: string;
      email: string;
      name: string;
      appliedJobIds: string[];
      skillIds: string[];
      categoryIds: string[];
    }>
  > {
    const result = await this.db
      .select({
        userId: cvs.userId,
        email: users.email,
        name: users.name,
        jobId: applyJobs.jobId,
        skillId: jobSkills.skillId,
        categoryId: jobs.categoryId,
      })
      .from(applyJobs)
      .innerJoin(cvs, eq(applyJobs.cvId, cvs.id))
      .innerJoin(users, eq(cvs.userId, users.id))
      .leftJoin(jobSkills, eq(applyJobs.jobId, jobSkills.jobId))
      .leftJoin(jobs, eq(applyJobs.jobId, jobs.id))
      .where(and(isNotNull(users.email), isNull(users.deletedAt)));

    // Group by user
    const userMap = new Map<
      string,
      {
        userId: string;
        email: string;
        name: string;
        appliedJobIds: string[];
        skillIds: string[];
        categoryIds: string[];
      }
    >();

    for (const row of result) {
      if (!row.userId || !row.email) continue;

      if (!userMap.has(row.userId)) {
        userMap.set(row.userId, {
          userId: row.userId,
          email: row.email,
          name: row.name || "User",
          appliedJobIds: [],
          skillIds: [],
          categoryIds: [],
        });
      }

      const user = userMap.get(row.userId)!;

      if (row.jobId && !user.appliedJobIds.includes(row.jobId)) {
        user.appliedJobIds.push(row.jobId);
      }

      if (row.skillId && !user.skillIds.includes(row.skillId)) {
        user.skillIds.push(row.skillId);
      }

      if (row.categoryId && !user.categoryIds.includes(row.categoryId)) {
        user.categoryIds.push(row.categoryId);
      }
    }

    return Array.from(userMap.values());
  }

  // [UPDATE]: Update logic to find recommended jobs
  async findRecommendedJobs(
    userId: string,
    appliedJobIds: string[],
    skillIds: string[],
    categoryIds: string[],
    createdAtStart: Date,
    createdAtEnd: Date,
    isJobSystem: boolean,
    limit = 20,
  ): Promise<JobResponse[]> {
    if (
      appliedJobIds.length === 0 ||
      (skillIds.length === 0 && categoryIds.length === 0)
    ) {
      return [];
    }

    const filters: JobFilters = {
      limit,
      page: 1,
      user: {
        userId,
        roles: [],
      },
      createdAtStart,
      createdAtEnd,
      isJobSystem,
    };

    const allJobs = await this.getJobsByAdmin(filters);

    // Filter jobs:
    // 1. Không phải job đã apply
    // 2. Có status = 'active'
    // 3. Chưa hết hạn
    // 4. Có skill hoặc category trùng với applied jobs
    const recommendedJobs = allJobs.data.filter((jobResponse) => {
      const job = jobResponse.job;

      if (appliedJobIds.includes(job.id)) {
        return false;
      }

      if (job.status !== "active") {
        return false;
      }

      if (job.endDate && new Date(job.endDate) < new Date()) {
        return false;
      }

      // Kiểm tra có skill hoặc category trùng
      const hasMatchingSkill =
        skillIds.length > 0 &&
        jobResponse.skills.some((skill) => skillIds.includes(skill.id));

      // Note: categories không có trong JobResponse, cần query thêm nếu cần
      // Tạm thời chỉ dùng skills để match

      return hasMatchingSkill;
    });

    recommendedJobs.sort((a, b) => {
      const aMatchCount = a.skills.filter((skill) =>
        skillIds.includes(skill.id),
      ).length;
      const bMatchCount = b.skills.filter((skill) =>
        skillIds.includes(skill.id),
      ).length;
      return bMatchCount - aMatchCount;
    });

    return recommendedJobs;
  }

  async getJobIdsActive(query: GeneralQuery): Promise<string[]> {
    const activeJobs = await this.db
      .select({
        id: jobs.id,
      })
      .from(jobs)
      .where(and(isNull(jobs.deletedAt), eq(jobs.status, JobStatusEnum.ACTIVE)))
      .limit(query.limit)
      .offset((query.page! - 1) * query.limit);

    return activeJobs.map((job) => job.id);
  }

  async getUserJobStatuses(
    userId: User["id"],
    jobIds: Job["id"][],
  ): Promise<
    Map<
      Job["id"],
      {
        isSaved: boolean;
        isApplied: boolean;
        applyStatus: string | null;
        applyId: ApplyJob["id"] | null;
      }
    >
  > {
    const statusMap = new Map<
      string,
      {
        isSaved: boolean;
        isApplied: boolean;
        applyStatus: string | null;
        applyId: string | null;
      }
    >();

    if (jobIds.length === 0) {
      return statusMap;
    }

    jobIds.forEach((jobId) => {
      statusMap.set(jobId, {
        isSaved: false,
        isApplied: false,
        applyStatus: null,
        applyId: null,
      });
    });

    // Parallel queries for saved and applied jobs
    const [savedJobs, appliedJobs] = await Promise.all([
      this.db
        .select({
          jobId: userInteractions.jobId,
        })
        .from(userInteractions)
        .where(
          and(
            eq(userInteractions.userId, userId),
            eq(userInteractions.type, UserInteractionEnum.SAVE),
            inArray(userInteractions.jobId, jobIds),
          ),
        ),
      this.db
        .select({
          jobId: applyJobs.jobId,
          status: applyJobs.status,
          applyId: applyJobs.id,
        })
        .from(applyJobs)
        .innerJoin(cvs, eq(applyJobs.cvId, cvs.id))
        .where(and(eq(cvs.userId, userId), inArray(applyJobs.jobId, jobIds))),
    ]);

    // Update saved status
    savedJobs.forEach((saved) => {
      const status = statusMap.get(saved.jobId);
      if (status) {
        status.isSaved = true;
      }
    });

    // Update applied status (take first application if multiple exist)
    appliedJobs.forEach((applied) => {
      const status = statusMap.get(applied.jobId);
      if (status) {
        status.isApplied = true;
        // Only update if not already set (prefer first result)
        if (!status.applyStatus) {
          status.applyStatus = applied.status;
          status.applyId = applied.applyId;
        }
      }
    });

    return statusMap;
  }

  async getJobTrends(params: JobTrendsQuery): Promise<JobTrends[]> {
    const { fromDate, toDate, type } = params;

    const whereConditions: SQL[] = [isNull(jobs.deletedAt)];

    if (fromDate) {
      whereConditions.push(gte(jobs.createdAt, new Date(fromDate)));
    }
    if (toDate) {
      whereConditions.push(lte(jobs.createdAt, new Date(toDate)));
    }

    if (type === JobTrendTypeEnum.CREATED) {
      whereConditions.push(isNull(jobs.jobRawId));
    } else if (type === JobTrendTypeEnum.CRAWLED) {
      whereConditions.push(isNotNull(jobs.jobRawId));
    }

    const result = await this.db
      .select({
        date: jobs.createdAt,
        count: countDistinct(jobs.id).as("count"),
      })
      .from(jobs)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(jobs.createdAt)
      .orderBy(asc(jobs.createdAt));

    return result.map((r) => ({
      date: convertDateToStr(r.date),
      count: Number(r.count),
    }));
  }
}
