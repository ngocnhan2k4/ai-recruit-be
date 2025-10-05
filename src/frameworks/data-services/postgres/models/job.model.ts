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
  boolean,
} from "drizzle-orm/pg-core";
import { companies, companyRaws } from "./company.model";
import { skills } from "./skill.model";
import { timestamps } from "./helpers";
import { categories } from "./category.model";
import { provinces } from "./province.model";
import { jsonb } from "drizzle-orm/pg-core";
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
  salaryRange: json("salary_range"), // storing as JSON for flexibility
  source: varchar("source", { length: 255 }).notNull(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: json("description"),
  companyId: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  datePosted: date("date_posted"),
  salaryMin: numeric("salary_min", { precision: 12, scale: 2 }),
  salaryMax: numeric("salary_max", { precision: 12, scale: 2 }),
  experienceMin: integer("experience_min"),
  experienceMax: integer("experience_max"),
  questions: jsonb("questions"),
  provinceId: uuid("province_id").references(() => provinces.id),
  endDate: date("end_date"),
  status: varchar("status", { length: 50 }).notNull().default("active"), // "active" | "inactive"
  priority: integer("priority").default(0), // Higher number = higher priority
  workType: varchar("work_type", { length: 50 }), // "remote" | "onsite"
  applyType: varchar("apply_type", { length: 50 }).notNull().default("onsite"), // "onsite" | "goto_url"
  applyUrl: text("apply_url"), // URL for external applications
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

// User job interactions table
export const userInteractions = pgTable("user_interactions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(), // References users table
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id),
  type: varchar("type", { length: 20 }).notNull(), // "save", "hide"
  ...timestamps,
});

export const applyJobs = pgTable("apply_jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(), // References users table
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id),
  status: varchar("status", { length: 50 }).default("pending"), // "pending", "accepted", "rejected"
  userCvId: uuid("user_cv_id").references(() => userCV.id),
  answers: jsonb("answers"),
  ...timestamps,
});

export const userCV = pgTable("user_cv", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull(), // References users table
  fileUrl: varchar("file_url", { length: 500 }).notNull(),
  fileName: varchar("file_name", { length: 255 }).notNull(),
  mimeType: varchar("mime_type", { length: 255 }).notNull(),
  fileSize: bigint("file_size", { mode: "number" }).notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  ...timestamps,
});
