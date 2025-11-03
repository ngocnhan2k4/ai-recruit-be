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
  cvs,
  jobRaws,
} from "../models";
import {
  DBDrizzleTransaction,
  type DBDrizzle,
} from "@/frameworks/data-services/postgres/types";
import { convertDateToStr } from "@/common/utils/date";
import { GenericRepository } from "./generic-repository";
import {
  IJobRepository,
  INotificationRepository,
  IOrganizationRepository,
  JobStatusEnum,
  WorkTypeEnum,
  Notification,
  NotificationType,
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
} from "@/core/entities/job.entity";
import { PaginatedResult } from "@/common/types/api";
import { GeneralQuery } from "@/common/types/api";
import { PaginationType } from "@/interfaces/dtos/common/query";
import { organizations } from "../models/organization.model";
import {
  JobFilters,
  JobResponse,
  StatisticsJobFilter,
} from "@/core/entities/job.entity";

@Injectable()
export class JobRepository
  extends GenericRepository<Job, typeof jobs>
  implements IJobRepository
{
  constructor(
    @Inject("DRIZZLE") protected db: DBDrizzle,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly notificationRepository: INotificationRepository,
  ) {
    super(db, jobs);
  }

  async getJobsByAdmin(
    filters: JobFilters,
  ): Promise<PaginatedResult<JobResponse>> {
    // Build where conditions
    const whereConditions: SQL[] = [];
    const { cursor, limit, page } = filters;
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
      whereConditions.push(eq(jobs.provinceId, filters.provinceId));
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

    // Determine pagination mode (cursor by default)
    const usePagePagination = filters?.pagination === PaginationType.PAGE;
    if (cursor && !usePagePagination) {
      whereConditions.push(gt(jobs.id, cursor));
    }

    // If using page pagination, compute offset/limit from query (fallback to function limit)
    const offset = usePagePagination
      ? (Math.max(page || 1, 1) - 1) * limit
      : undefined;

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
      })
      .from(jobs)
      .leftJoin(jobRaws, eq(jobs.jobRawId, jobRaws.id))
      .innerJoin(organizations, eq(jobs.organizationId, organizations.id))
      .leftJoin(companies, eq(organizations.id, companies.organizationId))
      .leftJoin(
        sql`LATERAL (
          SELECT json_agg(p) AS provinces
          FROM ${provinces} p
          WHERE p.id = ${jobs.provinceId}
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
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(asc(jobs.id))
      // apply pagination: offset/limit for page mode, limit(+1) for cursor mode
      .offset(offset ?? 0)
      .limit(limit + 1)) as {
      job: Job;
      provinces: Province[];
      organization: OrganizationWithDetails;
      skills: Skill[];
    }[];

    // Check if there's a next page
    const hasNextPage = result.length > limit;
    const data = hasNextPage ? result.slice(0, limit) : result;
    let total: number | undefined = undefined;
    if (usePagePagination) {
      total = (
        await this.db
          .select({
            total: countDistinct(jobs.id).as("total"),
          })
          .from(jobs)
          .leftJoin(jobCategories, eq(jobs.id, jobCategories.jobId))
          .where(
            whereConditions.length > 0 ? and(...whereConditions) : undefined,
          )
      )[0]?.total;
    }

    // Next cursor is only applicable for cursor pagination
    const nextCursor =
      !usePagePagination && hasNextPage && result[limit - 1]?.job
        ? `${result[limit - 1].job.id}`
        : undefined;

    return {
      data,
      pagination: {
        nextCursor,
        hasNextPage,
        total,
      },
    };
  }

  async getJobs(filters: JobFilters): Promise<PaginatedResult<JobResponse>> {
    // Build where conditions
    const whereConditions: SQL[] = [];
    const { cursor, limit, page } = filters;
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
      whereConditions.push(eq(jobs.provinceId, filters.provinceId));
    }

    if (filters?.organizationId) {
      whereConditions.push(eq(jobs.organizationId, filters.organizationId));
    }

    if (filters?.workType) {
      whereConditions.push(eq(jobs.workType, filters.workType));
    }

    if (filters?.user?.userId) {
      whereConditions.push(
        sql`NOT EXISTS (
          SELECT 1 FROM ${userInteractions} ui 
          WHERE ui.job_id = ${jobs.id} 
          AND ui.user_id = ${filters.user?.userId} 
          AND ui.type = 'hide'
        )`,
      );
    }

    // Determine pagination mode (cursor by default)
    const usePagePagination = filters?.pagination === PaginationType.PAGE;
    // Cursor pagination: only apply gt filter when using cursor pagination
    if (cursor && !usePagePagination) {
      // return empty array if user not logged in
      if (!filters?.user?.userId)
        return {
          data: [],
          pagination: { nextCursor: undefined, hasNextPage: false },
        };
      whereConditions.push(gt(jobs.id, cursor));
    }

    // If using page pagination, compute offset/limit from query (fallback to function limit)
    const offset = usePagePagination
      ? (Math.max(page || 1, 1) - 1) * limit
      : undefined;

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
      })
      .from(jobs)
      .leftJoin(jobRaws, eq(jobs.jobRawId, jobRaws.id))
      .innerJoin(organizations, eq(jobs.organizationId, organizations.id))
      .leftJoin(companies, eq(organizations.id, companies.organizationId))
      .leftJoin(
        sql`LATERAL (
          SELECT json_agg(p) AS provinces
          FROM ${provinces} p
          WHERE p.id = ${jobs.provinceId}
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
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined)
      .orderBy(asc(jobs.id))
      // apply pagination: offset/limit for page mode, limit(+1) for cursor mode
      .offset(offset ?? 0)
      .limit(limit + 1)) as {
      job: Job;
      provinces: Province[];
      organization: OrganizationWithDetails;
      skills: Skill[];
    }[];

    // Check if there's a next page
    const hasNextPage = result.length > limit;
    const data = hasNextPage ? result.slice(0, limit) : result;
    let total: number | undefined = undefined;
    if (usePagePagination) {
      total = (
        await this.db
          .select({
            total: countDistinct(jobs.id).as("total"),
          })
          .from(jobs)
          .leftJoin(jobCategories, eq(jobs.id, jobCategories.jobId))
          .where(
            whereConditions.length > 0 ? and(...whereConditions) : undefined,
          )
      )[0]?.total;
    }

    // Next cursor is only applicable for cursor pagination
    const nextCursor =
      !usePagePagination && hasNextPage && result[limit - 1]?.job
        ? `${result[limit - 1].job.id}`
        : undefined;

    return {
      data,
      pagination: {
        nextCursor,
        hasNextPage,
        total,
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

  async applyJob(
    jobId: string,
    userCvId: string,
    answers?: JobAnswer[],
  ): Promise<ApplyJobResponse> {
    // Check if user already applied for this job
    const existingApplication = await this.db
      .select()
      .from(applyJobs)
      .leftJoin(cvs, eq(applyJobs.cvId, cvs.id))
      .where(and(eq(applyJobs.cvId, userCvId), eq(applyJobs.jobId, jobId)))
      .limit(1);

    if (existingApplication.length > 0) {
      throw new Error("User has already applied for this job");
    }

    // Create new application
    const [newApplication] = await this.db
      .insert(applyJobs)
      .values({
        jobId,
        cvId: userCvId,
        answers,
        status: ApplyStatusEnum.PENDING,
      })
      .returning();

    // Update lastUsed timestamp for CV provided
    await this.db
      .update(cvs)
      .set({
        lastUsed: new Date(),
      })
      .where(eq(cvs.id, userCvId));

    return newApplication as ApplyJobResponse;
  }

  async updateApplyJob(
    applyId: string,
    status?: ApplyStatusEnum,
    userCvId?: string,
    answers?: JobAnswer[],
  ): Promise<ApplyJobResponse | null> {
    // Check if application exists and belongs to user
    const existingApplication = await this.db
      .select()
      .from(applyJobs)
      .where(and(eq(applyJobs.id, applyId)))
      .limit(1);

    if (existingApplication.length === 0) {
      throw new Error("Application not found or access denied");
    }

    // If user wants to change answers or userCvId, status must be APPLIED
    if (
      (answers || userCvId) &&
      existingApplication[0].status !== ApplyStatusEnum.PENDING
    ) {
      throw new Error("Status must be 'applied' to change answers or userCvId");
    }

    // Update application
    const [updatedApplication] = await this.db
      .update(applyJobs)
      .set({
        status: status || existingApplication[0].status,
        cvId: userCvId || existingApplication[0].cvId,
        answers: answers || existingApplication[0].answers,
        updatedAt: new Date(),
      })
      .where(eq(applyJobs.id, applyId))
      .returning();

    // Update lastUsed timestamp for CV if userCvId is provided
    if (userCvId) {
      await this.db
        .update(cvs)
        .set({
          lastUsed: new Date(),
        })
        .where(eq(cvs.id, userCvId));
    }

    return updatedApplication as ApplyJobResponse;
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
      .select()
      .from(applyJobs)
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

  async hideJob(
    userId: string,
    jobId: string,
    hide: boolean,
  ): Promise<UserInteractionResponse | null> {
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
        return existingInteraction[0] as UserInteractionResponse;
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

      return newInteraction as UserInteractionResponse;
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
      organizationId: job.organizationId!,
      description: job.description,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      experienceMin: job.experienceMin,
      experienceMax: job.experienceMax,
      datePosted: job.datePosted,
      endDate: job.endDate,
      workType: job.workType,
      jobRawId: job.jobRawId,
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
    return this.db.transaction(async (tx) => {
      return this.preUpdateJob(tx, jobId, job);
    });
  }

  async preUpdateJob(
    tx: DBDrizzleTransaction,
    jobId: string,
    job: Partial<Job> & { skillIds?: string[] },
  ): Promise<Job | null> {
    const [updatedJob] = await tx
      .update(jobs)
      .set({
        ...job,
      })
      .where(eq(jobs.id, jobId))
      .returning();

    if (job.skillIds !== undefined) {
      await tx.delete(jobSkills).where(eq(jobSkills.jobId, jobId));

      if (job.skillIds.length > 0) {
        const skillAssociations = job.skillIds.map((skillId) => ({
          jobId: jobId,
          skillId: skillId,
        }));

        await tx.insert(jobSkills).values(skillAssociations);
      }
    }
    return updatedJob as Job | null;
  }

  async updateJobWithNotifications(
    jobId: string,
    job: Partial<Job> & { skillIds?: string[] },
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

      if (job.skillIds !== undefined) {
        // Remove existing skill associations
        await tx.delete(jobSkills).where(eq(jobSkills.jobId, jobId));

        // Add new skill associations if any
        if (job.skillIds.length > 0) {
          const skillAssociations = job.skillIds.map((skillId) => ({
            jobId: jobId,
            skillId: skillId,
          }));

          await tx.insert(jobSkills).values(skillAssociations);
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
      console.log(
        "Notification recipients:",
        NotificationType.JOB_APPROVED,
        NotificationType.JOB_REJECTED,
      );
      const notifications =
        await this.notificationRepository.preCreateNotifications(
          tx,
          {
            title: "Job Status Updated",
            message: `Job "${updatedJob.title}" has been ${updatedJob.status.toLowerCase()}`,
            type:
              (updatedJob.status as JobStatusEnum) === JobStatusEnum.ACTIVE
                ? NotificationType.JOB_APPROVED
                : NotificationType.JOB_REJECTED,
            senderId: userId,
            payload: {
              jobId: updatedJob.id,
              orgId: updatedJob.organizationId,
            },
          },
          recipients,
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
      provinceName: string;
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
        provinceName: provinces.name,
        applyJobId: applyJobs.id,
      })
      .from(userInteractions)
      .innerJoin(jobs, eq(userInteractions.jobId, jobs.id))
      .innerJoin(organizations, eq(jobs.organizationId, organizations.id))
      .innerJoin(provinces, eq(jobs.provinceId, provinces.id))
      .leftJoin(cvs, and(eq(applyJobs.cvId, cvs.id), eq(cvs.userId, userId)))
      .leftJoin(applyJobs, eq(applyJobs.jobId, jobs.id))
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
  ): Promise<{
    job: Job;
    provinces: Province[];
    organization: OrganizationWithDetails;
    skills: Skill[];
    isSaved?: boolean;
    isApplied?: boolean;
    applyStatus?: string;
    applyId?: string;
  } | null> {
    // check if user is authenticated (userId exists and is not anonymous)
    const isAuthenticatedUser = userId;

    // Create query to get job information and relations
    const result = await this.db
      .select({
        job: jobs,
        provinces:
          sql`COALESCE(json_agg(DISTINCT ${provinces}) FILTER (WHERE ${provinces}.id IS NOT NULL), '[]')`.as(
            "provinces",
          ),
        organization: organizations,
        skills:
          sql`COALESCE(json_agg(${skills}) FILTER (WHERE ${skills}.id IS NOT NULL), '[]')`.as(
            "skills",
          ),
        // If user is authenticated, check if job is saved or applied
        isSaved: isAuthenticatedUser
          ? sql`EXISTS (
            SELECT 1 FROM ${userInteractions} ui 
            WHERE ui.job_id = ${jobs.id} 
            AND ui.user_id = ${userId} 
            AND ui.type = 'save'
          )`.as("isSaved")
          : sql`false`.as("isSaved"),
        isApplied: isAuthenticatedUser
          ? sql`EXISTS (
            SELECT 1 FROM ${applyJobs} aj 
            INNER JOIN ${cvs} c ON aj.cv_id = c.id
            WHERE aj.job_id = ${jobs.id} 
            AND c.user_id = ${userId}
          )`.as("isApplied")
          : sql`false`.as("isApplied"),
        applyStatus: isAuthenticatedUser
          ? sql`(
            SELECT aj.status FROM ${applyJobs} aj 
            INNER JOIN ${cvs} c ON aj.cv_id = c.id
            WHERE aj.job_id = ${jobs.id} 
            AND c.user_id = ${userId}
            LIMIT 1
          )`.as("applyStatus")
          : sql`NULL`.as("applyStatus"),
        applyId: isAuthenticatedUser
          ? sql`(
            SELECT aj.id FROM ${applyJobs} aj 
            INNER JOIN ${cvs} c ON aj.cv_id = c.id
            WHERE aj.job_id = ${jobs.id} 
            AND c.user_id = ${userId}
            LIMIT 1
          )`.as("applyId")
          : sql`NULL`.as("applyId"),
      })
      .from(jobs)
      .innerJoin(organizations, eq(jobs.organizationId, organizations.id))
      .leftJoin(provinces, eq(jobs.provinceId, provinces.id))
      .leftJoin(jobSkills, eq(jobs.id, jobSkills.jobId))
      .leftJoin(skills, eq(jobSkills.skillId, skills.id))
      .where(and(eq(jobs.id, jobId), isNull(jobs.deletedAt)))
      .groupBy(jobs.id, organizations.id, provinces.id)
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
    };
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
      provinceName: string;
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
        provinceName: provinces.name,
        applyJobId: applyJobs.id,
        applyStatus: applyJobs.status,
      })
      .from(applyJobs)
      .innerJoin(cvs, eq(applyJobs.cvId, cvs.id))
      .innerJoin(jobs, eq(applyJobs.jobId, jobs.id))
      .innerJoin(organizations, eq(jobs.organizationId, organizations.id))
      .innerJoin(provinces, eq(jobs.provinceId, provinces.id))
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
      })),
      pagination: {
        hasNextPage,
        total: total,
      },
    };
  }
}
