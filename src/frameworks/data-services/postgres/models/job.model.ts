import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  text,
  date,
  timestamp,
  json,
  uuid,
  primaryKey,
  numeric,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { companies, companyRaws } from "./company.model";
import { skills } from "./skill.model";
import { timestamps } from "./helpers";
import { categories } from "./category.model";
import { provinces } from "./province.model";
import { jsonb } from "drizzle-orm/pg-core";
import { users } from "./user.model";
import { ApplyStatusEnum, JobStatusEnum, WorkTypeEnum } from "./enums";
import { organizations } from "./organization.model";

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

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: json("description"),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  datePosted: date("date_posted"),
  salaryMin: numeric("salary_min", { precision: 12, scale: 2 }),
  salaryMax: numeric("salary_max", { precision: 12, scale: 2 }),
  experienceMin: integer("experience_min"),
  experienceMax: integer("experience_max"),
  questions: jsonb("questions"),
  provinceId: uuid("province_id").references(() => provinces.id),
  endDate: date("end_date"),
  status: JobStatusEnum("status").notNull().default("draft"),
  workType: WorkTypeEnum("work_type"),
  jobRawId: bigint("job_raw_id", { mode: "number" }).references(
    () => jobRaws.id,
  ),
  rejectReason: text("reject_reason"),
  ...timestamps,
});

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
  ],
);

export const jobCategories = pgTable(
  "job_categories",
  {
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id),
  },
  (table) => [
    primaryKey({
      columns: [table.jobId, table.categoryId],
    }),
  ],
);

export const UserInteractionTypeEnum = pgEnum("user_interaction_type", [
  "save",
  "hide",
]);

export const userInteractions = pgTable("user_interactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id),
  type: UserInteractionTypeEnum("type").notNull(),
  ...timestamps,
});

export const applyJobs = pgTable("apply_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id),
  status: ApplyStatusEnum("status").default("pending"),
  cvId: uuid("cv_id").references(() => cvs.id),
  answers: jsonb("answers"),

  ...timestamps,
});

export const cvs = pgTable("cvs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 255 }).notNull(),
  lastUsed: timestamp("last_used_at").defaultNow(),
  ...timestamps,
});
