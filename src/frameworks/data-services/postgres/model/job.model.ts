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
} from "drizzle-orm/pg-core";
import { companies, companyRaws } from "./company.model";
import { skills } from "./skill.model";
import { timestamps } from "./helpers";
import { categories } from "./category.model";
import { provinces } from "./province.model";

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
  provinceId: uuid("province_id").references(() => provinces.id),
  endDate: date("end_date"),
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
