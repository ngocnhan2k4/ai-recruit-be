import { pgTable } from "drizzle-orm/pg-core";
import { uuid, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";
import { OrganizationRoleEnum, organizationTypeEnum } from "./enums";
import { users } from "./user.model";
import { provinces } from "./province.model";

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  type: organizationTypeEnum("type").notNull(),
  description: text("description"),
  address: text("address").array(),
  logoUrl: varchar("logo_url", { length: 500 }),
  about: text("about"),
  websiteUrl: varchar("website_url", { length: 500 }),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  foundedYear: integer("founded_year"),
  verifiedAt: timestamp("verified_at"),
  employeesMin: integer("employees_min"),
  employeesMax: integer("employees_max"),
  // isVerified: boolean("is_verified").notNull().default(false),
  ...timestamps,
});

export const organizationMembers = pgTable("organization_members", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  role: OrganizationRoleEnum("role").notNull(),
  // temporary fields for denormalization, remove later
  organization_name: varchar("organization_name", { length: 255 }).notNull(),
  organization_type: organizationTypeEnum("organization_type").notNull(),
  organization_email: varchar("organization_email", { length: 255 }),
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
