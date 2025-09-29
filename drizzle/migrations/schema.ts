import {
  pgTable,
  foreignKey,
  bigserial,
  bigint,
  uuid,
  date,
  varchar,
  text,
  boolean,
  timestamp,
  integer,
  unique,
  json,
  uniqueIndex,
  numeric,
  primaryKey,
  pgEnum,
} from "drizzle-orm/pg-core";

export const educationLevel = pgEnum("education_level", [
  "high_school",
  "bachelor",
  "master",
  "phd",
  "other",
]);
export const gender = pgEnum("gender", ["Male", "Female", "Other"]);

export const userExperiences = pgTable(
  "user_experiences",
  {
    id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    userId: bigint("user_id", { mode: "number" }).notNull(),
    companyId: uuid("company_id").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date"),
    jobTitle: varchar("job_title", { length: 255 }).notNull(),
    description: text(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "user_experiences_user_id_users_id_fk",
    }),
    foreignKey({
      columns: [table.companyId],
      foreignColumns: [companies.id],
      name: "user_experiences_company_id_companies_id_fk",
    }),
  ],
);

export const companies = pgTable("companies", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: varchar({ length: 255 }).notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  description: text(),
  address: text().array(),
  employeesMin: integer("employees_min"),
  employeesMax: integer("employees_max"),
  websiteUrl: varchar("website_url", { length: 500 }),
  createdAt: timestamp("created_at", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" }),
  deletedAt: timestamp("deleted_at", { mode: "string" }),
});

export const userOnboardings = pgTable(
  "user_onboardings",
  {
    id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    userId: bigint("user_id", { mode: "number" }).notNull(),
    educationLevel: educationLevel("education_level"),
    major: varchar({ length: 255 }),
    school: varchar({ length: 255 }),
    currentGoal: varchar("current_goal", { length: 500 }),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "user_onboardings_user_id_users_id_fk",
    }),
    unique("user_onboardings_user_id_unique").on(table.userId),
  ],
);

export const skills = pgTable(
  "skills",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: varchar({ length: 255 }).notNull(),
  },
  (table) => [unique("skills_name_unique").on(table.name)],
);

export const companyRaws = pgTable("company_raws", {
  id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
  name: varchar({ length: 255 }).notNull(),
  logoUrl: varchar("logo_url", { length: 500 }),
  description: text(),
  address: text().array(),
  employees: varchar({ length: 50 }),
  websiteUrl: varchar("website_url", { length: 500 }),
  source: varchar({ length: 255 }).notNull(),
  crawledAt: timestamp("crawled_at", { mode: "string" }).defaultNow().notNull(),
});

export const jobRaws = pgTable(
  "job_raws",
  {
    id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
    title: varchar({ length: 255 }).notNull(),
    description: text(),
    url: varchar({ length: 500 }),
    datePosted: date("date_posted"),
    skills: text().array(),
    crawledAt: timestamp("crawled_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    companyId: bigint("company_id", { mode: "number" }).notNull(),
    salaryRange: json("salary_range"),
    source: varchar({ length: 255 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.companyId],
      foreignColumns: [companyRaws.id],
      name: "job_raws_company_id_company_raws_id_fk",
    }),
  ],
);

export const users = pgTable(
  "users",
  {
    id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
    username: varchar({ length: 255 }).notNull(),
    email: varchar({ length: 255 }),
    phone: varchar({ length: 20 }),
    avatarUrl: varchar("avatar_url", { length: 500 }),
    name: varchar({ length: 255 }).notNull(),
    dob: date(),
    gender: gender(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
    firebaseUid: varchar("firebase_uid", { length: 255 }),
  },
  (table) => [
    uniqueIndex("idx_users_email").using(
      "btree",
      table.email.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("idx_users_firebase_uid").using(
      "btree",
      table.firebaseUid.asc().nullsLast().op("text_ops"),
    ),
    uniqueIndex("idx_users_phone").using(
      "btree",
      table.phone.asc().nullsLast().op("text_ops"),
    ),
    unique("users_username_unique").on(table.username),
  ],
);

export const categories = pgTable(
  "categories",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: varchar({ length: 255 }).notNull(),
  },
  (table) => [unique("categories_name_unique").on(table.name)],
);

export const jobs = pgTable(
  "jobs",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    title: varchar({ length: 255 }).notNull(),
    description: json("description"),
    companyId: uuid("company_id").notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" }),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
    salaryMin: numeric("salary_min", { precision: 12, scale: 2 }),
    salaryMax: numeric("salary_max", { precision: 12, scale: 2 }),
  },
  (table) => [
    foreignKey({
      columns: [table.companyId],
      foreignColumns: [companies.id],
      name: "jobs_company_id_companies_id_fk",
    }),
  ],
);

export const userSkills = pgTable(
  "user_skills",
  {
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    userId: bigint("user_id", { mode: "number" }).notNull(),
    skillId: uuid("skill_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "user_skills_user_id_users_id_fk",
    }),
    foreignKey({
      columns: [table.skillId],
      foreignColumns: [skills.id],
      name: "user_skills_skill_id_skills_id_fk",
    }),
    primaryKey({
      columns: [table.userId, table.skillId],
      name: "user_skills_user_id_skill_id_pk",
    }),
  ],
);

export const jobCategories = pgTable(
  "job_categories",
  {
    jobId: uuid("job_id").notNull(),
    categoryId: uuid("category_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [jobs.id],
      name: "job_categories_job_id_jobs_id_fk",
    }),
    foreignKey({
      columns: [table.categoryId],
      foreignColumns: [categories.id],
      name: "job_categories_category_id_categories_id_fk",
    }),
    primaryKey({
      columns: [table.jobId, table.categoryId],
      name: "job_categories_job_id_category_id_pk",
    }),
  ],
);

export const jobSkills = pgTable(
  "job_skills",
  {
    jobId: uuid("job_id").notNull(),
    skillId: uuid("skill_id").notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.jobId],
      foreignColumns: [jobs.id],
      name: "job_skills_job_id_jobs_id_fk",
    }),
    foreignKey({
      columns: [table.skillId],
      foreignColumns: [skills.id],
      name: "job_skills_skill_id_skills_id_fk",
    }),
    primaryKey({
      columns: [table.jobId, table.skillId],
      name: "job_skills_job_id_skill_id_pk",
    }),
  ],
);
