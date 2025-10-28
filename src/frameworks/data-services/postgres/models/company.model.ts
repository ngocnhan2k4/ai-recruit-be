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
import { organizations } from "./organization.model";

export const companies = pgTable("companies", {
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .primaryKey(),
  companySize: integer("company_size"),
  culture: text("culture"),
  taxCode: varchar("tax_code", { length: 100 }),
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
