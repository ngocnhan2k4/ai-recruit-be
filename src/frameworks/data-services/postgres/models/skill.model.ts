import {
  pgTable,
  uuid,
  varchar,
  text,
  jsonb,
  boolean,
} from "drizzle-orm/pg-core";
import { timestamps } from "./helpers";

export const skills = pgTable("skills", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: varchar("slug", { length: 255 }).unique(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),

  proficiencyLevels: jsonb("proficiency_levels").$type<{
    beginner?: {
      summary: string;
      criteria: string[];
    };
    intermediate?: {
      summary: string;
      criteria: string[];
    };
    advanced?: {
      summary: string;
      criteria: string[];
    };
  }>(),

  isApproved: boolean("is_approved").notNull().default(false),

  ...timestamps,
});
