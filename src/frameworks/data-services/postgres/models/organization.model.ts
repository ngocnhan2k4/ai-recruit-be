import { index, pgTable } from "drizzle-orm/pg-core";
import { uuid, varchar, text, integer, timestamp } from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";
import {
  OrganizationInviteStatusEnum,
  OrganizationInviteTypeEnum,
  OrganizationRoleEnum,
  organizationTypeEnum,
} from "./enums";
import { users } from "./user.model";
import { provinces } from "./province.model";
import { uniqueIndex } from "drizzle-orm/pg-core";

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

export const organizationMembers = pgTable(
  "organization_members",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    role: OrganizationRoleEnum("role").notNull(),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_org_member_unique").on(table.userId, table.organizationId),
    index("idx_org_member_org").on(table.organizationId),
    index("idx_org_member_user").on(table.userId),
    index("idx_org_member_org_role").on(table.organizationId, table.role),
  ],
);

export const organizationLocations = pgTable(
  "organization_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    address: text("address").notNull(),
    provinceId: uuid("province_id").references(() => provinces.id),
    ...timestamps,
  },
  (table) => [
    index("idx_org_location_org").on(table.organizationId),
    index("idx_org_location_province").on(table.provinceId),
  ],
);

export const organizationInvitations = pgTable(
  "organization_invitations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => users.id),
    receiverId: uuid("receiver_id").references(() => users.id),
    role: OrganizationRoleEnum("role").notNull(),
    type: OrganizationInviteTypeEnum("type").notNull(),
    status: OrganizationInviteStatusEnum("status").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    ...timestamps,
  },
  (table) => [
    index("idx_org_invitation_org").on(table.organizationId, table.createdAt),
  ],
);
