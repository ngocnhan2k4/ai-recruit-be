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
import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
} from "@nestjs/common";
import {
  jobs,
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
  Category,
  User,
  UserInteractionEnum,
  ApplyJob,
  JobDetailFilter,
  UserStatusEnum,
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
import {
  ApplyJobFilters,
  JobFilters,
  JobResponse,
  StatisticsJobFilter,
} from "@/core";
import { CACHE_KEYS, SHORT_TTL } from "@/common/constants/cache";
import { endOfDay } from "date-fns/endOfDay";
import { startOfDay } from "date-fns/startOfDay";
import { RESPONSE_CODE } from "@/common/constants";
import { ICacheService } from "@/core";

@Injectable()
export class JobRepository
  extends GenericRepository<Job, typeof jobs>
  implements IJobRepository
{
  private readonly logger = new Logger(JobRepository.name);

  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    private readonly cacheService: ICacheService,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly notificationRepository: INotificationRepository,
  ) {
    super(db, jobs);
  }

  private async invalidateJobCache(jobId: string) {
    const pattern = CACHE_KEYS.job.patternDetail(jobId);

    try {
      const matchedKeys = await this.cacheService.getKeysByPattern(pattern);
      await this.cacheService.deleteMultipleKeys(matchedKeys);
    } catch (err) {
      this.logger.warn(
        `[cache] Failed to invalidate job cache for ${jobId} (pattern ${pattern})`,
        err,
      );
    }
  }

  get(id: string): Promise<Job | null> {
    const key = CACHE_KEYS.job.get(id);
    return cacheWithDedup<Job | null>(
      key,
      () => this.cacheService.getJson<Job | null>(key),
      () => super.get(id),
      (data: Job | null) => this.cacheService.setJson(key, data, SHORT_TTL),
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

    await Promise.all(data.map((job) => this.invalidateJobCache(job.id)));
    return data;
  }

  async delete(where: Partial<Job>, tx?: DBDrizzleTransaction): Promise<Job[]> {
    const data = await super.delete(where, tx);

    await Promise.all(data.map((job) => this.invalidateJobCache(job.id)));
    return data;
  }

  // Priority to get datePosted (the date that job is posted)
  // if datePosted is null, use createdAt as fallback (the date that the job is crawled)
  private getEffectivePostedDateExpr() {
    return sql`COALESCE(${jobs.datePosted}::timestamp, ${jobs.createdAt})`;
  }

  // Calculate average salary, if salaryMin or salaryMax is null, use the other one as average, if both are null, return 0
  private getAverageSalaryExpr() {
    return sql`COALESCE((${jobs.salaryMin}::numeric + ${jobs.salaryMax}::numeric) / 2, ${jobs.salaryMin}::numeric, ${jobs.salaryMax}::numeric, 0)`;
  }

  private resolveSortExpr(sortBy?: string, sortDirection?: "asc" | "desc") {
    const direction = sortDirection === "desc" ? desc : asc;
    if (sortBy === "salary") {
      return direction(this.getAverageSalaryExpr());
    }
    if (sortBy === "date_posted") {
      return direction(this.getEffectivePostedDateExpr());
    }
    return null;
  }

  async getJobsByAdmin(
    filters: JobFilters,
  ): Promise<PaginatedResult<JobResponse>> {
    // Build where conditions
    const whereConditions: SQL[] = [];
    const { limit, page } = filters;

    if (filters?.keyword) {
      const keyword = `%${filters.keyword}%`;

      whereConditions.push(
        or(ilike(sql`${jobs.id}::text`, keyword), ilike(jobs.title, keyword))!,
      );
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
    if (filters?.status) {
      whereConditions.push(eq(jobs.status, filters.status));
    }

    if (filters?.categoryIds?.length) {
      whereConditions.push(inArray(jobs.categoryId, filters.categoryIds));
    }

    if (filters?.fromDate) {
      whereConditions.push(
        gte(this.getEffectivePostedDateExpr(), new Date(filters.fromDate)),
      );
    }

    if (filters?.toDate) {
      whereConditions.push(
        lte(this.getEffectivePostedDateExpr(), new Date(filters.toDate)),
      );
    }

    if (filters?.isJobSystem) {
      whereConditions.push(isNull(jobs.jobRawId));
    }

    const offset = (Math.max(page || 1, 1) - 1) * limit;
    const dynamicSort = this.resolveSortExpr(
      filters?.sortBy,
      filters?.sortDirection,
    );

    // Add one extra item to check if there's a next page
    const result = (await this.db
      .select({
        job: jobs,
        organization: organizations,
        skills: sql`COALESCE(s_lateral.skills, '[]')`.as("skills"),
        provinces: sql`COALESCE(p_lateral.provinces, '[]')`.as("provinces"),
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
          SELECT json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name
            )
          ) AS skills
          FROM ${jobSkills} js
          INNER JOIN ${skills} s ON js.skill_id = s.id
          WHERE js.job_id = ${jobs.id}
        ) s_lateral`,
        sql`TRUE`,
      )
      .leftJoin(categories, eq(jobs.categoryId, categories.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(
        dynamicSort ||
          (filters?.organizationId ? desc(jobs.datePosted) : asc(jobs.id)),
      )
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

  private buildPublicJobListWhereConditions(filters: JobFilters): SQL[] {
    const whereConditions: SQL[] = [];

    if (filters.keyword) {
      whereConditions.push(ilike(jobs.title, `%${filters.keyword}%`));
    }
    whereConditions.push(isNull(jobs.deletedAt));

    if (filters.salaryMin !== undefined) {
      whereConditions.push(gte(jobs.salaryMin, filters.salaryMin.toString()));
    }

    if (filters.salaryMax !== undefined) {
      whereConditions.push(lte(jobs.salaryMax, filters.salaryMax.toString()));
    }

    if (filters.experienceMin !== undefined) {
      whereConditions.push(gte(jobs.experienceMin, filters.experienceMin));
    }

    if (filters.experienceMax !== undefined) {
      whereConditions.push(lte(jobs.experienceMax, filters.experienceMax));
    }

    if (filters.provinceId) {
      whereConditions.push(
        sql`EXISTS (
          SELECT 1 FROM ${jobProvinces} jp
          WHERE jp.job_id = ${jobs.id}
          AND jp.province_id = ${filters.provinceId}
        )`,
      );
    }

    if (filters.organizationId) {
      whereConditions.push(eq(jobs.organizationId, filters.organizationId));
    }

    if (filters.categoryId) {
      whereConditions.push(eq(jobs.categoryId, filters.categoryId));
    }

    if (filters.workType) {
      whereConditions.push(eq(jobs.workType, filters.workType));
    }

    if (filters?.fromDate) {
      whereConditions.push(
        gte(this.getEffectivePostedDateExpr(), new Date(filters.fromDate)),
      );
    }

    if (filters.toDate) {
      const toDate = new Date(filters.toDate);
      toDate.setHours(23, 59, 59, 999);
      whereConditions.push(lte(this.getEffectivePostedDateExpr(), toDate));
    }

    if (filters.skillIds?.length) {
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

    if (filters.status) {
      whereConditions.push(eq(jobs.status, filters.status));
    }
    const categoryIds = filters.categoryIds || [];
    if (categoryIds?.length > 0) {
      whereConditions.push(inArray(jobs.categoryId, categoryIds));
    }
    return whereConditions;
  }

  async getJobs(filters: JobFilters): Promise<PaginatedResult<JobResponse>> {
    const whereConditions = this.buildPublicJobListWhereConditions(filters);
    const { cursor, limit } = filters;
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

    const dynamicSort = this.resolveSortExpr(
      filters?.sortBy,
      filters?.sortDirection,
    );
    const isOffsetCursor = !!dynamicSort;
    let offsetValue = 0;

    if (cursor) {
      // return empty array if user not logged in
      if (!filters?.user?.userId)
        return {
          data: [],
          pagination: { nextCursor: undefined, hasNextPage: false },
        };

      if (isOffsetCursor) {
        if (!isNaN(parseInt(cursor))) {
          offsetValue = parseInt(cursor);
        }
      } else {
        whereConditions.push(lt(jobs.createdAt, new Date(Number(cursor))));
      }
    }

    const applyUserLateral = filters.user?.userId
      ? sql`LATERAL (
          SELECT aj.status AS apply_status, aj.id AS apply_id
          FROM ${applyJobs} aj
          INNER JOIN ${cvs} c ON aj.cv_id = c.id
          WHERE aj.job_id = ${jobs.id}
            AND c.user_id = ${filters.user.userId}
          LIMIT 1
        ) apply_user`
      : sql`LATERAL (
          SELECT NULL::text AS apply_status, NULL::uuid AS apply_id
          WHERE false
        ) apply_user`;

    const fields = filters?.fields || [];

    const totalApplyLateral = fields.includes("totalApplications")
      ? sql`LATERAL (
        SELECT COUNT(*) AS total_applications
        FROM ${applyJobs} aj
        WHERE aj.job_id = ${jobs.id}
      ) total_applications_lateral`
      : sql`LATERAL (SELECT NULL::integer AS total_applications) total_applications_lateral`;

    // Add one extra item to check if there's a next page
    const query = this.db
      .select({
        job: {
          id: jobs.id,
          title: jobs.title,
          description: jobs.description,
          datePosted: jobs.datePosted,
          endDate: jobs.endDate,
          salaryMin: jobs.salaryMin,
          salaryMax: jobs.salaryMax,
          experienceMin: jobs.experienceMin,
          experienceMax: jobs.experienceMax,
          recruitCount: jobs.recruitCount,
          questions: jobs.questions,
          workType: jobs.workType,
          status: jobs.status,
          createdAt: jobs.createdAt,
          organizationId: jobs.organizationId,
          applyUrl: sql`COALESCE(${jobs.applyUrl}, ${jobRaws.url})`.as(
            "applyUrl",
          ),
        },
        provinces: sql`COALESCE(p_lateral.provinces, '[]')`.as("provinces"),
        organization: {
          id: organizations.id,
          name: organizations.name,
          description: organizations.description,
          websiteUrl: organizations.websiteUrl,
          employeesMin: organizations.employeesMin,
          employeesMax: organizations.employeesMax,
          logoUrl: organizations.logoUrl,
        },
        skills: sql`COALESCE(s_lateral.skills, '[]')`.as("skills"),
        isSaved: filters?.user?.userId
          ? sql`EXISTS (
              SELECT 1 FROM ${userInteractions} ui 
              WHERE ui.job_id = ${jobs.id} 
              AND ui.user_id = ${filters.user?.userId} 
              AND ui.type = 'save'
            )`.as("isSaved")
          : sql`false`.as("isSaved"),
        isApplied: sql`(apply_user.apply_id IS NOT NULL)`.as("isApplied"),
        applyStatus: sql`apply_user.apply_status`.as("applyStatus"),
        applyId: sql`apply_user.apply_id`.as("applyId"),
        category: categories,
        totalApplications:
          sql`COALESCE(total_applications_lateral.total_applications, 0)`.as(
            "totalApplications",
          ),
      })
      .from(jobs)
      .leftJoin(jobRaws, eq(jobs.jobRawId, jobRaws.id))
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
          SELECT json_agg(
            json_build_object(
              'id', s.id,
              'name', s.name
            )
          ) AS skills
          FROM ${jobSkills} js
          INNER JOIN ${skills} s ON js.skill_id = s.id
          WHERE js.job_id = ${jobs.id}
        ) s_lateral`,
        sql`TRUE`,
      )
      .leftJoin(categories, eq(jobs.categoryId, categories.id))
      .leftJoin(applyUserLateral, sql`TRUE`)
      .leftJoin(totalApplyLateral, sql`TRUE`)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    if (isOffsetCursor) {
      query
        .orderBy(dynamicSort)
        .offset(offsetValue)
        .limit(limit + 1);
    } else {
      query.orderBy(desc(jobs.createdAt)).limit(limit + 1);
    }

    const result = (await query) as {
      job: any;
      provinces: Province[];
      organization: any;
      skills: Skill[];
      category: Category;
      totalApplications: number;
    }[];

    // Check if there's a next page
    const hasNextPage = result.length > limit;
    const data = hasNextPage ? result.slice(0, limit) : result;

    // Next cursor is only applicable for cursor pagination
    let nextCursor: string | number | undefined = undefined;
    if (hasNextPage) {
      if (isOffsetCursor) {
        nextCursor = offsetValue + limit;
      } else {
        nextCursor = data[data.length - 1]?.job?.createdAt?.getTime();
      }
    }

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
      isCategoryNotNull,
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
      isCategoryNotNull ? isNotNull(jobsTable.categoryId) : undefined,
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
        id: jobs.id,
        title: jobs.title,
        count: countDistinct(applyJobs.id).as("count"),
      })
      .from(jobs)
      .leftJoin(applyJobs, eq(jobs.id, applyJobs.jobId))
      .where(and(...conditions, isNotNull(applyJobs.id)))
      .groupBy(jobs.title, jobs.id)
      .orderBy(desc(sql`count(*)`))
      .limit(limit);

    const totalApplications = result.reduce(
      (sum, item) => sum + Number(item.count),
      0,
    );

    return result.map((item) => ({
      id: item.id,
      name: item.title,
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
    const [grouped, totalRes] = await Promise.all([
      this.db
        .select({
          status: jobs.status,
          count: countDistinct(jobs.id).as("count"),
        })
        .from(jobs)
        .where(isNull(jobs.deletedAt))
        .groupBy(jobs.status),
      this.db
        .select({ total: countDistinct(jobs.id).as("total") })
        .from(jobs)
        .where(isNull(jobs.deletedAt)),
      this.db
        .select({ total: countDistinct(jobs.id).as("total") })
        .from(jobs)
        .where(isNull(jobs.deletedAt)),
    ]);

    const total = Number(totalRes[0]?.total ?? 0);

    return {
      total,
      byStatus: grouped.map((r: any) => ({
        status: r.status,
        count: Number(r.count ?? 0),
      })),
    };
  }

  async applyJob({
    jobId,
    userCvId,
    senderUserId,
    answers,
  }: {
    jobId: string;
    userCvId: string;
    senderUserId: string;
    answers?: JobAnswer[];
  }): Promise<ApplyJobResponse> {
    const newApplication = await this.executeWithTransaction(async (tx) => {
      const existingApplication = await tx
        .select({ id: applyJobs.id })
        .from(applyJobs)
        .innerJoin(cvs, eq(applyJobs.cvId, cvs.id))
        .where(and(eq(cvs.userId, senderUserId), eq(applyJobs.jobId, jobId)))
        .limit(1);

      if (existingApplication.length > 0) {
        throw new BadRequestException({
          code: RESPONSE_CODE.ALREADY_APPLIED,
          message: "User has already applied for this job",
        });
      }

      const [inserted] = await tx
        .insert(applyJobs)
        .values({
          jobId,
          cvId: userCvId,
          answers,
          status: ApplyStatusEnum.PENDING,
        })
        .returning();

      return inserted as ApplyJobResponse;
    });

    return newApplication;
  }

  async updateApplyJob(
    applyId: string,
    data: Record<string, any>,
  ): Promise<ApplyJobResponse> {
    const [updatedApplication] = await this.getExecutor()
      .update(applyJobs)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(applyJobs.id, applyId))
      .returning();

    return updatedApplication as ApplyJobResponse;
  }

  async getApplyJobById(applyId: string): Promise<ApplyJobResponse | null> {
    const result = await this.db
      .select({
        id: applyJobs.id,
        jobId: applyJobs.jobId,
        cvId: applyJobs.cvId,
        status: applyJobs.status,
        answers: applyJobs.answers,
        matchingScore: applyJobs.matchingScore,
        matchingCriteria: applyJobs.matchingCriteria,
        createdAt: applyJobs.createdAt,
        updatedAt: applyJobs.updatedAt,
      })
      .from(applyJobs)
      .where(eq(applyJobs.id, applyId))
      .limit(1);

    return result[0] as ApplyJobResponse | null;
  }

  async getApplyJobs(
    filters: ApplyJobFilters,
  ): Promise<PaginatedResult<ApplyJobResponse>> {
    const { jobId, ids = [] } = filters;
    const limit = Math.max(filters?.limit ?? 10, 1);
    const cursor = filters?.cursor;

    const whereConditions: SQL[] = [];
    if (jobId) {
      whereConditions.push(eq(applyJobs.jobId, jobId));
    }
    if (cursor && !isNaN(Number(cursor))) {
      whereConditions.push(lt(applyJobs.createdAt, new Date(Number(cursor))));
    }
    if (ids.length > 0) {
      whereConditions.push(inArray(applyJobs.id, ids));
    }

    const data = await this.db
      .select({
        id: applyJobs.id,
        jobId: applyJobs.jobId,
        status: applyJobs.status,
        answers: applyJobs.answers,
        matchingScore: applyJobs.matchingScore,
        matchingCriteria: applyJobs.matchingCriteria,
        createdAt: applyJobs.createdAt,
        updatedAt: applyJobs.updatedAt,
        user: {
          id: cvs.userId,
          email: users.email,
          name: users.name,
          avatarUrl: users.avatarUrl,
          username: users.username,
        },
        cv: {
          id: cvs.id,
          name: cvs.name,
          fileUrl: cvs.fileUrl,
          mimeType: cvs.mimeType,
        },
      })
      .from(applyJobs)
      .innerJoin(cvs, eq(applyJobs.cvId, cvs.id))
      .innerJoin(
        users,
        and(eq(cvs.userId, users.id), eq(users.status, UserStatusEnum.ACTIVE)),
      )
      .where(and(...whereConditions))
      .orderBy(desc(applyJobs.createdAt))
      .limit(limit + 1);

    const hasNextPage = data.length > limit;
    const pageData = hasNextPage ? data.slice(0, limit) : data;

    const applications = pageData.map((item) => ({
      id: item.id,
      jobId: item.jobId,
      status: item.status,
      answers: item.answers,
      matchingScore: item.matchingScore,
      matchingCriteria: item.matchingCriteria,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      user: item.user,
      cv: item.cv,
    })) as ApplyJobResponse[];

    const nextCursor = hasNextPage
      ? applications[applications.length - 1]?.createdAt?.getTime()
      : undefined;

    return {
      data: applications,
      pagination: {
        hasNextPage,
        nextCursor,
      },
    };
  }

  async getAppliedUserIdsByJobId(jobId: string): Promise<string[]> {
    const rows = await this.db
      .selectDistinct({ userId: cvs.userId })
      .from(applyJobs)
      .innerJoin(cvs, eq(applyJobs.cvId, cvs.id))
      .where(eq(applyJobs.jobId, jobId));

    return rows.map((row) => row.userId);
  }

  async toggleSaveJob(
    userId: string,
    jobId: string,
  ): Promise<{
    status: "saved" | "unsaved" | "unchanged";
    interaction: UserInteractionResponse | null;
  }> {
    return this.executeWithTransaction(async (tx) => {
      const [created] = await tx
        .insert(userInteractions)
        .values({
          userId,
          jobId,
          type: UserInteractionEnum.SAVE,
        })
        .onConflictDoNothing()
        .returning();

      if (created) {
        return {
          status: "saved",
          interaction: created as UserInteractionResponse,
        };
      }

      const [deleted] = await tx
        .delete(userInteractions)
        .where(
          and(
            eq(userInteractions.userId, userId),
            eq(userInteractions.jobId, jobId),
            eq(userInteractions.type, UserInteractionEnum.SAVE),
          ),
        )
        .returning();

      if (deleted) {
        return { status: "unsaved", interaction: null };
      }

      const [row] = await tx
        .select()
        .from(userInteractions)
        .where(
          and(
            eq(userInteractions.userId, userId),
            eq(userInteractions.jobId, jobId),
            eq(userInteractions.type, UserInteractionEnum.SAVE),
          ),
        )
        .limit(1);

      return { status: "unchanged", interaction: (row as any) ?? null };
    });
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
  ): Promise<Job> {
    const jobData = {
      title: job.title!,
      organizationId: job.organizationId!,
      categoryId: job.categoryId!,
      description: job.description,
      applyUrl: job.applyUrl,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      experienceMin: job.experienceMin,
      experienceMax: job.experienceMax,
      recruitCount: job.recruitCount ?? null,
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

      return newJob as Job;
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
    return this.executeWithTransaction(async (tx) => {
      const [updatedJob] = await tx
        .update(jobs)
        .set({
          ...job,
        })
        .where(eq(jobs.id, jobId))
        .returning();

      if (!updatedJob) {
        return null;
      }

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
          const provinceAssociations = filteredProvinceIds.map(
            (provinceId) => ({
              jobId,
              provinceId,
            }),
          );
          await tx.insert(jobProvinces).values(provinceAssociations);
        }
      }

      await this.invalidateJobCache(jobId);
      return updatedJob as Job | null;
    });
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
      applyUrl: string | null;
      applyId: string | null;
      applyStatus: string | null;
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
        applyUrl: sql`COALESCE(${jobs.applyUrl}, ${jobRaws.url})`.as(
          "applyUrl",
        ),
      })
      .from(userInteractions)
      .innerJoin(jobs, eq(userInteractions.jobId, jobs.id))
      .innerJoin(organizations, eq(jobs.organizationId, organizations.id))
      .leftJoin(applyJobs, eq(applyJobs.jobId, jobs.id))
      .leftJoin(cvs, and(eq(applyJobs.cvId, cvs.id), eq(cvs.userId, userId)))
      .leftJoin(jobRaws, eq(jobs.jobRawId, jobRaws.id))
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
        applyUrl: (item.applyUrl as string | null) ?? null,
        applyId: item.applyJobId ?? null,
        applyStatus: item.applyStatus ?? null,
      })),
      pagination: {
        hasNextPage,
        total: total,
      },
    };
  }
  async getFullJobById(
    jobId: string,
    filter?: JobDetailFilter,
  ): Promise<JobResponse | null> {
    // Create query to get job information and relations
    const key = filter?.userId
      ? CACHE_KEYS.job.getWithDetailByUser(jobId, filter.userId)
      : CACHE_KEYS.job.getWithDetail(jobId);

    return cacheWithDedup(
      key,
      () => this.cacheService.getJson<JobResponse | null>(key),
      async () => {
        let query: any = this.db
          .select({
            job: {
              ...jobs,
              applyUrl: sql`COALESCE(${jobs.applyUrl}, ${jobRaws.url})`.as(
                "applyUrl",
              ),
            },
            provinces: sql`COALESCE(p_lateral.provinces, '[]')`.as("provinces"),
            organization: organizations,
            skills: sql`COALESCE(s_lateral.skills, '[]')`.as("skills"),
            // If user is authenticated, check if job is saved or applied
            isSaved: filter?.userId
              ? sql`EXISTS (
            SELECT 1 FROM ${userInteractions} ui 
            WHERE ui.job_id = ${jobs.id} 
            AND ui.user_id = ${filter.userId} 
            AND ui.type = 'save'
          )`.as("isSaved")
              : sql`false`.as("isSaved"),
            isApplied: filter?.userId
              ? sql`EXISTS (
            SELECT 1 FROM ${applyJobs} aj 
            INNER JOIN ${cvs} c ON aj.cv_id = c.id
            WHERE aj.job_id = ${jobs.id} 
            AND c.user_id = ${filter.userId}
          )`.as("isApplied")
              : sql`false`.as("isApplied"),
            applyStatus: filter?.userId
              ? sql`(
            SELECT aj.status FROM ${applyJobs} aj 
            INNER JOIN ${cvs} c ON aj.cv_id = c.id
            WHERE aj.job_id = ${jobs.id} 
            AND c.user_id = ${filter.userId}
            LIMIT 1
          )`.as("applyStatus")
              : sql`NULL`.as("applyStatus"),
            applyId: filter?.userId
              ? sql`(
            SELECT aj.id FROM ${applyJobs} aj 
            INNER JOIN ${cvs} c ON aj.cv_id = c.id
            WHERE aj.job_id = ${jobs.id} 
            AND c.user_id = ${filter.userId}
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
          .leftJoin(jobRaws, eq(jobs.jobRawId, jobRaws.id))
          .where(and(eq(jobs.id, jobId), isNull(jobs.deletedAt)))
          .limit(1);

        const conditions = [eq(jobs.id, jobId), isNull(jobs.deletedAt)];

        if (filter?.statuses && filter.statuses.length > 0) {
          conditions.push(inArray(jobs.status, filter.statuses));
        }

        query = query.where(and(...conditions));

        const result = await query;

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
          isSaved: Boolean(data.isSaved),
          isApplied: Boolean(data.isApplied),
          applyStatus: (data.applyStatus as string | null) ?? null,
          applyId: (data.applyId as string | null) ?? null,
          applyUrl: data.job.applyUrl as string | null | undefined,
          category: data.category as Category,
        };
      },
      (data: JobResponse | null) =>
        this.cacheService.setJson(key, data, SHORT_TTL),
      {
        logger: this.logger,
      },
    );
  }
  private async getNumberOfSavedJobs(userId: string): Promise<number> {
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
  private async getNumberOfAppliedJobs(userId: string): Promise<number> {
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
      .innerJoin(
        users,
        and(eq(cvs.userId, users.id), eq(users.status, UserStatusEnum.ACTIVE)),
      )
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
    fromDate: string,
    toDate: string,
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
      fromDate,
      toDate,
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
      whereConditions.push(gte(jobs.createdAt, startOfDay(new Date(fromDate))));
    }
    if (toDate) {
      whereConditions.push(lte(jobs.createdAt, endOfDay(new Date(toDate))));
    }

    if (type === JobTrendTypeEnum.CREATED) {
      whereConditions.push(isNull(jobs.jobRawId));
    } else if (type === JobTrendTypeEnum.CRAWLED) {
      whereConditions.push(isNotNull(jobs.jobRawId));
    }

    const dateExpr = sql`DATE(${jobs.createdAt})`;

    const result = await this.db
      .select({
        date: dateExpr,
        count: countDistinct(jobs.id).as("count"),
      })
      .from(jobs)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(dateExpr)
      .orderBy(asc(dateExpr));

    return result.map((r) => ({
      date: convertDateToStr(r.date as string),
      count: Number(r.count),
    }));
  }

  async countSyncableJobsForSearch(): Promise<number> {
    const [row] = await this.db
      .select({
        count: countDistinct(jobs.id).as("count"),
      })
      .from(jobs)
      .where(
        and(eq(jobs.status, JobStatusEnum.ACTIVE), isNotNull(jobs.categoryId)),
      );

    return Number(row?.count ?? 0);
  }

  async getJobsV2(filters?: JobFilters): Promise<PaginatedResult<JobResponse>> {
    const ids = filters?.ids || [];

    const db: any = this.db
      .select({
        job: {
          id: jobs.id,
          questions: jobs.questions,
        },
        applyUrl: sql`COALESCE(${jobs.applyUrl}, ${jobRaws.url})`.as(
          "applyUrl",
        ),
      })
      .from(jobs)
      .leftJoin(jobRaws, eq(jobRaws.id, jobs.jobRawId));

    const whereConditions: SQL[] = [isNull(jobs.deletedAt)];

    if (ids.length > 0) {
      whereConditions.push(inArray(jobs.id, ids));
    }

    const result = await db.where(
      whereConditions.length > 0 ? and(...whereConditions) : undefined,
    );

    return {
      data: result,
      pagination: {},
    };
  }

  async updateMatchingScore(
    applyId: string,
    score: number | null,
    criteria: Record<string, any>,
  ): Promise<void> {
    await this.getExecutor()
      .update(applyJobs)
      .set({
        matchingScore: score === null ? null : score.toFixed(2),
        matchingCriteria: criteria,
        scoredAt: new Date(),
      })
      .where(eq(applyJobs.id, applyId));
  }
}
