import {
  pgTable,
  bigserial,
  varchar,
  date,
  pgEnum,
  bigint,
  uuid,
  text,
  boolean,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { companies } from "./company.model";
import { skills } from "./skill.model";
import { timestamps } from "./helpers";

export const genderEnum = pgEnum("gender", ["Male", "Female", "Other"]);
export const educationLevelEnum = pgEnum("education_level", [
  "high_school",
  "bachelor",
  "master",
  "phd",
  "other",
]);

export const users = pgTable(
  "users",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    username: varchar("username", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }),
    emailVerified: boolean("email_verified").notNull().default(false),
    phone: varchar("phone", { length: 20 }),
    firebaseUid: varchar("firebase_uid", { length: 255 }),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    name: varchar("name", { length: 255 }).notNull(),
    dob: date("dob"),
    gender: genderEnum("gender"),
    ...timestamps,
  },
  (table) => [
    uniqueIndex("idx_users_email").on(table.email),
    uniqueIndex("idx_users_firebase_uid").on(table.firebaseUid),
    uniqueIndex("idx_users_phone").on(table.phone),
  ],
);

export const userExperiences = pgTable("user_experiences", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  user_id: bigint("user_id", { mode: "number" })
    .notNull()
    .references(() => users.id),
  company_id: uuid("company_id")
    .notNull()
    .references(() => companies.id),
  start_date: date("start_date").notNull(),
  end_date: date("end_date"),
  job_title: varchar("job_title", { length: 255 }).notNull(),
  description: text("description"),
  is_current: boolean("is_current").notNull().default(false),
  ...timestamps,
});

export const userSkills = pgTable(
  "user_skills",
  {
    user_id: bigint("user_id", { mode: "number" })
      .notNull()
      .references(() => users.id),
    skill_id: uuid("skill_id")
      .notNull()
      .references(() => skills.id),
  },
  (table) => [primaryKey({ columns: [table.user_id, table.skill_id] })],
);

export const userOnboardings = pgTable("user_onboardings", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  user_id: bigint("user_id", { mode: "number" })
    .notNull()
    .unique()
    .references(() => users.id),
  education_level: educationLevelEnum("education_level"),
  major: varchar("major", { length: 255 }),
  school: varchar("school", { length: 255 }),
  current_goal: varchar("current_goal", { length: 500 }),
});
