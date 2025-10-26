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
import { provinces, users } from "../schema";
import { organizations } from "./organization.model";
import { organizationTypeEnum } from "./enums";

export const companies = pgTable("companies", {
  organizationId: uuid("organization_id")
    .references(() => organizations.id, { onDelete: "cascade" })
    .primaryKey(),
  companySize: integer("company_size"),
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

export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  organizationName: varchar("organization_name", { length: 255 }).notNull(),
  organizationType: organizationTypeEnum("organization_type").notNull(),
  organizationEmail: varchar("organization_email", { length: 255 }),
  role: varchar("role", { length: 100 }).notNull(),
  ...timestamps,
});

export const organizationLocations = pgTable("organization_locations", {
  id: uuid("id").primaryKey().defaultRandom(),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  address: text("address").notNull(),
  provinceId: uuid("province_id").references(() => provinces.id),
  ...timestamps,
});
