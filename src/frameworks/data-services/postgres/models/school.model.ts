import { pgTable, uuid } from "drizzle-orm/pg-core";
import { organizations } from "./organization.model";
import { timestamps } from "./helpers";
import { SchoolTypeEnum } from "./enums";

export const schools = pgTable("schools", {
  organizationId: uuid("organization_id")
    .primaryKey()
    .references(() => organizations.id),
  schoolType: SchoolTypeEnum("school_type").notNull(),
  ...timestamps,
});
