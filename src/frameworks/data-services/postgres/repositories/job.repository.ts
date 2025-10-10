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
} from "drizzle-orm";
import { Inject, Injectable } from "@nestjs/common";
import {
  jobs,
  companies,
  skills,
  jobSkills,
  jobCategories,
  provinces,
  userInteractions,
  applyJobs,
  userCV,
} from "../models";
import { type DBDrizzle } from "@/frameworks/data-services/postgres/types";
import { convertDateToStr } from "@/common/utils/date";
import { GenericRepository } from "./generic-repository";
import { IJobRepository } from "@/core";
import { AnonymousId } from "@/common/constants/roles";
import { Job, Province, Skill, Company } from "@/core/entities";
import {
  ApplyJobResponseDto,
  UserInteractionResponseDto,
  JobAnswerDto,
} from "@/interfaces/dtos";
import {
  JobFilters,
  CursorPaginationResult,
  StatisticsJobFilter,
} from "@/core/abstracts/repositories/job-repository.abstract";

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
    cursor?: string,
    filters?: JobFilters & { userId?: string },
  ): Promise<
    CursorPaginationResult<{
      job: Job;
      provinces: Province[];
      company: Company;
      skills: Skill[];
      isSaved?: boolean;
      isApplied?: boolean;
      applyStatus?: string;
      applyId?: string;
    }>
  > {
    // Build where conditions
    const whereConditions: SQL[] = [];

    // Keyword search
    if (filters?.keyword) {
      whereConditions.push(ilike(jobs.title, `%${filters.keyword}%`));
    }
    // Get jobs not deleted
    whereConditions.push(isNull(jobs.deletedAt));

    // Salary range filter
    if (filters?.salaryRange) {
      if (filters.salaryRange.min !== undefined) {
        whereConditions.push(
          gte(jobs.salaryMin, filters.salaryRange.min.toString()),
        );
      }
      if (filters.salaryRange.max !== undefined) {
        whereConditions.push(
          lte(jobs.salaryMax, filters.salaryRange.max.toString()),
        );
      }
    }

    // Experience range filter
    if (filters?.experienceRange) {
      if (filters.experienceRange.min !== undefined) {
        whereConditions.push(
          gte(jobs.experienceMin, filters.experienceRange.min),
        );
      }
      if (filters.experienceRange.max !== undefined) {
        whereConditions.push(
          lte(jobs.experienceMax, filters.experienceRange.max),
        );
      }
    }

    // Province filter
    if (filters?.provinceId) {
      whereConditions.push(eq(jobs.provinceId, filters.provinceId));
    }

    // Company filter
    if (filters?.companyId) {
      whereConditions.push(eq(jobs.companyId, filters.companyId));
    }

    // Work type filter
    if (filters?.workType) {
      whereConditions.push(eq(jobs.workType, filters.workType));
    }

    // Status filter
    if (filters?.status) {
      whereConditions.push(eq(jobs.status, filters.status));
    }

    // Filter out hidden jobs for authenticated users (exclude anonymous users)
    if (filters?.userId && filters.userId !== AnonymousId) {
      whereConditions.push(
        sql`NOT EXISTS (
          SELECT 1 FROM ${userInteractions} ui 
          WHERE ui.job_id = ${jobs.id} 
          AND ui.user_id = ${filters.userId} 
          AND ui.type = 'hide'
        )`,
      );
    }

    // Cursor pagination - using composite cursor (priority, id) for priority-based sorting
    if (cursor) {
      // For priority-based sorting, we need a composite cursor
      // Format: "priority:id" (e.g., "5:uuid-string")
      const [cursorPriority, cursorId] = cursor.split(":");
      const cursorPriorityNum = parseInt(cursorPriority);
      whereConditions.push(
        or(
          // Higher priority than cursor
          gt(jobs.priority, cursorPriorityNum),
          // Same priority but higher ID
          and(eq(jobs.priority, cursorPriorityNum), gt(jobs.id, cursorId)),
        ) as SQL,
      );
    }

    // Add one extra item to check if there's a next page
    const result = (await this.db
      .select({
        job: jobs,
        provinces:
          sql`COALESCE(json_agg(DISTINCT ${provinces}) FILTER (WHERE ${provinces}.id IS NOT NULL), '[]')`.as(
            "provinces",
          ),
        company: companies,
        skills:
          sql`COALESCE(json_agg(${skills}) FILTER (WHERE ${skills}.id IS NOT NULL), '[]')`.as(
            "skills",
          ),
        isSaved:
          filters?.userId && filters.userId !== AnonymousId
            ? sql`EXISTS (
              SELECT 1 FROM ${userInteractions} ui 
              WHERE ui.job_id = ${jobs.id} 
              AND ui.user_id = ${filters.userId} 
              AND ui.type = 'save'
            )`.as("isSaved")
            : sql`false`.as("isSaved"),
        isApplied:
          filters?.userId && filters.userId !== AnonymousId
            ? sql`EXISTS (
              SELECT 1 FROM ${applyJobs} aj 
              WHERE aj.job_id = ${jobs.id} 
              AND aj.user_id = ${filters.userId}
            )`.as("isApplied")
            : sql`false`.as("isApplied"),
        applyStatus:
          filters?.userId && filters.userId !== AnonymousId
            ? sql`(
              SELECT aj.status FROM ${applyJobs} aj 
              WHERE aj.job_id = ${jobs.id} 
              AND aj.user_id = ${filters.userId}
              LIMIT 1
            )`.as("applyStatus")
            : sql`NULL`.as("applyStatus"),
        applyId:
          filters?.userId && filters.userId !== AnonymousId
            ? sql`(
              SELECT aj.id FROM ${applyJobs} aj 
              WHERE aj.job_id = ${jobs.id} 
              AND aj.user_id = ${filters.userId}
              LIMIT 1
            )`.as("applyId")
            : sql`NULL`.as("applyId"),
      })
      .from(jobs)
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .leftJoin(provinces, eq(jobs.provinceId, provinces.id))
      .leftJoin(jobSkills, eq(jobs.id, jobSkills.jobId))
      .leftJoin(skills, eq(jobSkills.skillId, skills.id))
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .groupBy(jobs.id, companies.id)
      .orderBy(desc(jobs.priority), asc(jobs.id)) // Sort by priority (desc) then ID for consistent cursor pagination
      .limit(limit + 1)) as {
      job: Job;
      provinces: Province[];
      company: Company;
      skills: Skill[];
      isSaved: boolean;
      isApplied: boolean;
      applyStatus: string | null;
      applyId: string | null;
    }[];

    // Check if there's a next page
    const hasNextPage = result.length > limit;
    const data = hasNextPage ? result.slice(0, limit) : result;

    // Transform null values to undefined for optional fields
    const transformedData = data.map((item) => ({
      ...item,
      applyStatus: item.applyStatus || undefined,
      applyId: item.applyId || undefined,
    }));
    // Create composite cursor: "priority:id"
    const nextCursor =
      hasNextPage && result[limit - 1]?.job
        ? `${result[limit - 1].job.priority}:${result[limit - 1].job.id}`
        : undefined;

    return {
      data: transformedData,
      nextCursor,
      hasNextPage,
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

  async applyJob(
    userId: string,
    jobId: string,
    userCvId?: string,
    answers?: Array<{ question: string; answer: string }>,
  ): Promise<ApplyJobResponseDto> {
    // Check if user already applied for this job
    const existingApplication = await this.db
      .select()
      .from(applyJobs)
      .where(and(eq(applyJobs.userId, userId), eq(applyJobs.jobId, jobId)))
      .limit(1);

    if (existingApplication.length > 0) {
      throw new Error("User has already applied for this job");
    }

    // Create new application
    const [newApplication] = await this.db
      .insert(applyJobs)
      .values({
        userId,
        jobId,
        userCvId,
        answers,
        status: "applied",
      })
      .returning();

    // Update lastUsed timestamp for CV if userCvId is provided
    if (userCvId) {
      await this.db
        .update(userCV)
        .set({
          lastUsed: new Date(),
        })
        .where(eq(userCV.id, userCvId));
    }

    return newApplication as ApplyJobResponseDto;
  }

  async updateApplyJob(
    applyId: string,
    userId: string,
    status?: string,
    userCvId?: string,
    answers?: JobAnswerDto[],
  ): Promise<ApplyJobResponseDto | null> {
    // Check if application exists and belongs to user
    const existingApplication = await this.db
      .select()
      .from(applyJobs)
      .where(and(eq(applyJobs.id, applyId), eq(applyJobs.userId, userId)))
      .limit(1);

    if (existingApplication.length === 0) {
      throw new Error("Application not found or access denied");
    }

    // If user wants to change answers or userCvId, status must be APPLIED
    if ((answers || userCvId) && existingApplication[0].status !== "applied") {
      throw new Error("Status must be 'applied' to change answers or userCvId");
    }

    // Update application
    const [updatedApplication] = await this.db
      .update(applyJobs)
      .set({
        status: status || existingApplication[0].status,
        userCvId: userCvId || existingApplication[0].userCvId,
        answers: answers || existingApplication[0].answers,
        updatedAt: new Date(),
      })
      .where(eq(applyJobs.id, applyId))
      .returning();

    // Update lastUsed timestamp for CV if userCvId is provided
    if (userCvId) {
      await this.db
        .update(userCV)
        .set({
          lastUsed: new Date(),
        })
        .where(eq(userCV.id, userCvId));
    }

    return updatedApplication as ApplyJobResponseDto;
  }

  async getApplyJobById(
    applyId: string,
    userId: string,
  ): Promise<ApplyJobResponseDto | null> {
    const result = await this.db
      .select()
      .from(applyJobs)
      .where(and(eq(applyJobs.id, applyId), eq(applyJobs.userId, userId)))
      .limit(1);

    return result[0] as ApplyJobResponseDto | null;
  }

  async saveJob(
    userId: string,
    jobId: string,
    save: boolean,
  ): Promise<UserInteractionResponseDto | null> {
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
        return existingInteraction[0] as UserInteractionResponseDto;
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

      return newInteraction as UserInteractionResponseDto;
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

  async hideJob(
    userId: string,
    jobId: string,
    hide: boolean,
  ): Promise<UserInteractionResponseDto | null> {
    // Check if user already has a hide interaction for this job
    const existingInteraction = await this.db
      .select()
      .from(userInteractions)
      .where(
        and(
          eq(userInteractions.userId, userId),
          eq(userInteractions.jobId, jobId),
          eq(userInteractions.type, "hide"),
        ),
      )
      .limit(1);

    if (hide) {
      // User wants to hide the job
      if (existingInteraction.length > 0) {
        // Job already hidden, return existing interaction
        return existingInteraction[0] as UserInteractionResponseDto;
      }

      // Create new hide interaction
      const [newInteraction] = await this.db
        .insert(userInteractions)
        .values({
          userId,
          jobId,
          type: "hide",
        })
        .returning();

      return newInteraction as UserInteractionResponseDto;
    } else {
      // User wants to unhide the job
      if (existingInteraction.length > 0) {
        // Delete the existing interaction
        await this.db
          .delete(userInteractions)
          .where(
            and(
              eq(userInteractions.userId, userId),
              eq(userInteractions.jobId, jobId),
              eq(userInteractions.type, "hide"),
            ),
          );
      }
      return null; // No interaction exists after unhiding
    }
  }

  async createJob(job: Partial<Job> & { skillIds?: string[] }): Promise<Job> {
    const jobData = {
      title: job.title!,
      companyId: job.companyId!,
      description: job.description,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      experienceMin: job.experienceMin,
      experienceMax: job.experienceMax,
      datePosted: job.datePosted,
      endDate: job.endDate,
      workType: job.workType,
      applyType: job.applyType || "onsite",
      applyUrl: job.applyUrl,
      priority: job.priority || 0,
      provinceId: job.provinceId,
      questions: job.questions,
      status: job.status || "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const [newJob] = await this.db.insert(jobs).values(jobData).returning();

    // Handle skill associations if skillIds provided
    if (job.skillIds && job.skillIds.length > 0) {
      const skillAssociations = job.skillIds.map((skillId) => ({
        jobId: newJob.id,
        skillId: skillId,
      }));

      await this.db.insert(jobSkills).values(skillAssociations);
    }

    return newJob as Job;
  }

  async updateJob(
    jobId: string,
    job: Partial<Job> & { skillIds?: string[] },
  ): Promise<Job | null> {
    const [updatedJob] = await this.db
      .update(jobs)
      .set({
        ...job,
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
      .returning();

    // Handle skill associations if skillIds provided
    if (job.skillIds !== undefined) {
      // Remove existing skill associations
      await this.db.delete(jobSkills).where(eq(jobSkills.jobId, jobId));

      // Add new skill associations if any
      if (job.skillIds.length > 0) {
        const skillAssociations = job.skillIds.map((skillId) => ({
          jobId: jobId,
          skillId: skillId,
        }));

        await this.db.insert(jobSkills).values(skillAssociations);
      }
    }

    return updatedJob as Job | null;
  }

  async deleteJob(jobId: string): Promise<boolean> {
    const result = await this.db
      .update(jobs)
      .set({
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(jobs.id, jobId))
      .returning();

    return result.length > 0;
  }

  async getJobById(jobId: string): Promise<Job | null> {
    const result = await this.db
      .select()
      .from(jobs)
      .where(and(eq(jobs.id, jobId), isNull(jobs.deletedAt)))
      .limit(1);

    return result[0] as Job | null;
  }

  async getAllSavedJobs(
    userId: string,
    sortOption: "createdAt" | "endedAt",
  ): Promise<
    {
      id: string;
      title: string;
      salaryMin: string | null;
      salaryMax: string | null;
      companyName: string;
      logoUrl: string | null;
      workType: string | null;
      createdAt: Date;
      endedAt: string | null;
      provinceName: string;
    }[]
  > {
    const result = await this.db
      .select({
        id: jobs.id,
        title: jobs.title,
        salaryMin: jobs.salaryMin,
        salaryMax: jobs.salaryMax,
        companyName: companies.name,
        logoUrl: companies.logoUrl,
        workType: jobs.workType,
        createdAt: jobs.createdAt,
        endedAt: jobs.endDate,
        provinceName: provinces.name,
      })
      .from(userInteractions)
      .innerJoin(jobs, eq(userInteractions.jobId, jobs.id))
      .innerJoin(companies, eq(jobs.companyId, companies.id))
      .innerJoin(provinces, eq(jobs.provinceId, provinces.id))
      .where(
        and(
          eq(userInteractions.userId, userId),
          eq(userInteractions.type, "save"),
          isNull(jobs.deletedAt),
        ),
      )
      .orderBy(
        sortOption === "createdAt" ? desc(jobs.createdAt) : desc(jobs.endDate),
      )
      .limit(20);

    return result;
  }
}
