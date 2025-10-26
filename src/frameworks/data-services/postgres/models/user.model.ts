import {
  pgTable,
  bigserial,
  varchar,
  date,
  uuid,
  text,
  boolean,
  primaryKey,
  uniqueIndex,
  integer,
  jsonb,
} from "drizzle-orm/pg-core";
import { skills } from "./skill.model";
import { timestamps } from "./helpers";
import { RoleEnum } from "@/common/constants/roles";
import { organizations } from "./organization.model";
import {
  GenderEnum,
  EducationLevelEnum,
  ProviderEnum,
  UserStatusEnum,
} from "./enums";

export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    username: varchar("username", { length: 255 }).notNull().unique(),
    email: varchar("email", { length: 255 }),
    emailVerified: boolean("email_verified").notNull().default(false),
    phone: varchar("phone", { length: 20 }),
    firebaseUid: varchar("firebase_uid", { length: 255 }),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    bannerUrl: varchar("banner_url", { length: 500 }),
    name: varchar("name", { length: 255 }).notNull(),
    roles: varchar("roles", { length: 255 })
      .array()
      .notNull()
      .default([RoleEnum.USER]),
    dob: date("dob"),
    bio: varchar("bio", { length: 500 }),
    address: varchar("address", { length: 255 }),
    phoneVerified: boolean("phone_verified").notNull().default(false),
    gender: GenderEnum("gender"),
    provider: ProviderEnum("provider").notNull().default("email"),
    status: UserStatusEnum("status").notNull().default("active"),
    ...timestamps,
    onboardingCompleted: boolean("onboarding_completed")
      .notNull()
      .default(false),
  },
  (table) => [
    uniqueIndex("idx_users_email").on(table.email),
    uniqueIndex("idx_users_firebase_uid").on(table.firebaseUid),
    uniqueIndex("idx_users_phone").on(table.phone),
  ],
);

export const userExperiences = pgTable("user_experiences", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  organizationId: uuid("organization_id")
    .notNull()
    .references(() => organizations.id),
  position: varchar("position", { length: 255 }).notNull(),
  startDate: date("start_date").notNull(),
  endDate: date("end_date"),
  jobTitle: varchar("job_title", { length: 255 }).notNull(),
  description: text("description"),
  ...timestamps,
});

export const userSkills = pgTable(
  "user_skills",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    skillId: uuid("skill_id")
      .notNull()
      .references(() => skills.id),
    organizationId: uuid("organization_id").references(() => organizations.id),
  },
  (table) => [primaryKey({ columns: [table.userId, table.skillId] })],
);

export const userOnboardings = pgTable("user_onboardings", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  educationLevel: EducationLevelEnum("education_level"),
  major: varchar("major", { length: 255 }),
  school: varchar("school", { length: 255 }),
  currentGoal: varchar("current_goal", { length: 500 }),
  experienceYears: integer("experience_years"),
  experienceDetails: varchar("experience_details", { length: 500 }),
  skills: jsonb("skills"),
});
