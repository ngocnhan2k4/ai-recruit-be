import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigserial,
  timestamp,
} from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  logo_url: varchar("logo_url", { length: 500 }),
  description: text("description"),
  address: text("address").array(),
  employees_min: integer("employees_min"),
  employees_max: integer("employees_max"),
  website_url: varchar("website_url", { length: 500 }),
  ...timestamps,
});

export const companyRaws = pgTable("company_raws", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  logo_url: varchar("logo_url", { length: 500 }),
  description: text("description"),
  address: text("address").array(),
  employees: varchar("employees", { length: 50 }), // storing as string to handle ranges like "50-100"
  website_url: varchar("website_url", { length: 500 }),
  source: varchar("source", { length: 255 }).notNull(),
  crawled_at: timestamp("crawled_at").notNull().defaultNow(),
});
