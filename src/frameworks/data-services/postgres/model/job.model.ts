import {
  pgTable,
  bigserial,
  bigint,
  varchar,
  text,
  date,
  timestamp,
  json,
} from "drizzle-orm/pg-core";
import { companyRaws } from "./company.model";

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
