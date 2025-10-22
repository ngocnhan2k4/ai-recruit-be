import { pgTable, boolean } from "drizzle-orm/pg-core";
import { uuid, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";
import {
  UserStatusEnum,
  OrganizationTypeEnum,
  organizationTypeEnum,
} from "./enums";

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
