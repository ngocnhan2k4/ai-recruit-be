import { pgTable } from "drizzle-orm/pg-core";
import { uuid, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";
import { UserStatusEnum, organizationTypeEnum } from "./enums";
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
  organizationCulture: text("organization_culture"),
  employeesMin: integer("employees_min"),
  employeesMax: integer("employees_max"),
  // isVerified: boolean("is_verified").notNull().default(false),
  status: UserStatusEnum("status").notNull().default("active"),
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
