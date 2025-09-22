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
} from "drizzle-orm/pg-core";
import { companies, companyRaws } from "./company.model";
import { skills } from "./skill.model";
import { timestamps } from "./helpers";
import { categories } from "./category.model";

export const jobRaws = pgTable("job_raws", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  url: varchar("url", { length: 500 }),
  date_posted: date("date_posted"),
  skills: text("skills").array(), // storing as array of strings
  crawled_at: timestamp("crawled_at").notNull().defaultNow(),
  company_id: bigint("company_id", { mode: "number" })
    .notNull()
    .references(() => companyRaws.id),
  salary_range: json("salary_range"), // storing as JSON for flexibility
  source: varchar("source", { length: 255 }).notNull(),
});

export const jobs = pgTable("jobs", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  company_id: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  salary_min: numeric("salary_min", { precision: 12, scale: 2 }),
  salary_max: numeric("salary_max", { precision: 12, scale: 2 }),
  ...timestamps,
});

export const jobSkills = pgTable(
  "job_skills",
  {
    job_id: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    skill_id: uuid("skill_id")
      .notNull()
      .references(() => skills.id),
  },
  (table) => [
    primaryKey({
      columns: [table.job_id, table.skill_id],
    }),
  ],
);

export const jobCategories = pgTable(
  "job_categories",
  {
    job_id: uuid("job_id")
      .notNull()
      .references(() => jobs.id),
    category_id: uuid("category_id")
      .notNull()
      .references(() => categories.id),
  },
  (table) => [
    primaryKey({
      columns: [table.job_id, table.category_id],
    }),
  ],
);
