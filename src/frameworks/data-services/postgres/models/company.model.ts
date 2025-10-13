import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  bigserial,
  timestamp,
  bigint,
} from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";
import { users } from "../schema";

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  description: text("description"),
  address: text("address").array(),
  employeesMin: integer("employees_min"),
  employeesMax: integer("employees_max"),
  websiteUrl: varchar("website_url", { length: 500 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 50 }),
  foundingYear: integer("founding_year"),
  taxCode: varchar("tax_code", { length: 100 }),
  organization_culture: text("organization_culture"),
  benefits: text("benefits"),
  companyRawId: bigint("company_raw_id", { mode: "number" }).references(
    () => companyRaws.id,
  ),
  ...timestamps,
});

export const companyRaws = pgTable("company_raws", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  description: text("description"),
  address: text("address").array(),
  employeesMin: integer("employees_min"),
  employeesMax: integer("employees_max"),
  websiteUrl: varchar("website_url", { length: 500 }),
  source: varchar("source", { length: 255 }).notNull(),
  crawledAt: timestamp("crawled_at").notNull().defaultNow(),
});

export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => companies.id),
  role: varchar("role", { length: 100 }).notNull(),
  ...timestamps,
});
