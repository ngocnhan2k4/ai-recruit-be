import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  pgEnum,
} from "drizzle-orm/pg-core";
import { organizations } from "./organization.model";
import { timestamps } from "./helpers";
import { OrganizationTypeEnum } from "./enums";

export const SchoolTypeEnum = pgEnum("school_type", [
  "college",
  "university",
  "highschool",
  "secondary",
  "primary",
]);

export const schools = pgTable("schools", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id),
  schoolType: SchoolTypeEnum("school_type").notNull(),
  ...timestamps,
});
