import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  text,
  date,
  timestamp,
  uuid,
  primaryKey,
  numeric,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { desc } from "drizzle-orm";
import { companyRaws } from "./company.model";
import { skills } from "./skill.model";
import { timestamps } from "./helpers";
import { categories } from "./category.model";
import { provinces } from "./province.model";
import { jsonb } from "drizzle-orm/pg-core";
import { users } from "./user.model";
import {
  ApplyStatusEnum,
  JobStatusEnum,
  UserInteractionTypeEnum,
  WorkTypeEnum,
} from "./enums";
import { organizations } from "./organization.model";
import { aiCvs } from "./ai-cvs.model";

export const jobRaws = pgTable("job_raws", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  url: varchar("url", { length: 500 }),
  datePosted: date("date_posted"),
  skills: text("skills").array(), // storing as array of strings
  crawledAt: timestamp("crawled_at").notNull().defaultNow(),
  companyId: bigint("company_id", { mode: "number" })
    .notNull()
    .references(() => companyRaws.id),
  salaryMin: numeric("salary_min", { precision: 12, scale: 2 }),
  salaryMax: numeric("salary_max", { precision: 12, scale: 2 }),
  provinces: text("provinces").array(), // List of raw provinces
  category: text("category"), // Job raw category
  source: varchar("source", { length: 255 }).notNull(),
});

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    datePosted: date("date_posted"),
    salaryMin: numeric("salary_min", { precision: 12, scale: 2 }),
    salaryMax: numeric("salary_max", { precision: 12, scale: 2 }),
    experienceMin: integer("experience_min"),
    experienceMax: integer("experience_max"),
    questions: jsonb("questions"),
    applyUrl: varchar("apply_url", { length: 500 }),
    endDate: date("end_date"),
    status: JobStatusEnum("status").notNull().default("pending_approval"),
    workType: WorkTypeEnum("work_type"),
    jobRawId: bigint("job_raw_id", { mode: "number" }).references(
      () => jobRaws.id,
    ),
    rejectReason: text("reject_reason"),
    categoryId: uuid("category_id").references(() => categories.id),
    recruitCount: integer("recruit_count"),
    ...timestamps,
  },
  (table) => [
    index("idx_jobs_deleted_id").on(table.deletedAt, table.id),
    index("idx_jobs_organization_id_deleted").on(
      table.organizationId,
      table.deletedAt,
    ),
    index("idx_jobs_category_id_deleted")
      .on(table.categoryId, table.deletedAt)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_jobs_status_deleted").on(table.status, table.deletedAt),
    index("idx_jobs_work_type_deleted")
      .on(table.workType, table.deletedAt)
      .where(sql`${table.deletedAt} IS NULL`),
    index("idx_jobs_date_posted")
      .on(table.datePosted)
      .where(sql`${table.datePosted} IS NOT NULL`),
    index("idx_jobs_end_date_deleted")
      .on(table.endDate, table.deletedAt)
      .where(sql`${table.endDate} IS NOT NULL AND ${table.deletedAt} IS NULL`),
    index("idx_jobs_job_raw_id").on(table.jobRawId),
  ],
);

export const jobProvinces = pgTable(
  "job_provinces",
  {
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    provinceId: uuid("province_id")
      .notNull()
      .references(() => provinces.id),
  },
  (table) => [
    primaryKey({
      columns: [table.jobId, table.provinceId],
    }),
    index("idx_job_provinces_job_id").on(table.jobId),
    index("idx_job_provinces_province_job").on(table.provinceId, table.jobId),
  ],
);

export const jobSkills = pgTable(
  "job_skills",
  {
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id),
  },
  (table) => [
    primaryKey({
      columns: [table.jobId, table.skillId],
    }),
    index("idx_job_skills_job_id").on(table.jobId),
    index("idx_job_skills_skill").on(table.skillId),
  ],
);

// [TODO]: Migrate using user action
export const userInteractions = pgTable(
  "user_interactions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    type: UserInteractionTypeEnum("type").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("uniq_user_interactions_user_job_type").on(
      table.userId,
      table.jobId,
      table.type,
    ),
    index("idx_user_interactions_user_type_created").on(
      table.userId,
      table.type,
      desc(table.createdAt),
    ),
    index("idx_user_interactions_job_type_created").on(
      table.jobId,
      table.type,
      table.createdAt,
    ),
  ],
);

export const applyJobs = pgTable(
  "apply_jobs",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    status: ApplyStatusEnum("status").default("pending"),
    cvId: uuid("cv_id").references(() => cvs.id),
    answers: jsonb("answers"),
    matchingScore: numeric("matching_score", { precision: 7, scale: 2 }),
    matchingRank: integer("matching_rank"),
    matchingCriteria: jsonb("matching_criteria"),
    scoredAt: timestamp("scored_at"),

    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_apply_jobs_cv_job").on(table.cvId, table.jobId),
    index("idx_apply_jobs_job_id_created").on(
      table.jobId,
      desc(table.createdAt),
    ),
  ],
);

export const cvs = pgTable("cvs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  aiCvId: uuid("ai_cv_id").references(() => aiCvs.id, {
    onDelete: "set null",
  }),
  name: varchar("name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 255 }).notNull(),
  lastUsed: timestamp("last_used_at").defaultNow(),
  ...timestamps,
});
