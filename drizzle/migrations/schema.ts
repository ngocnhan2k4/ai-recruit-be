import { pgTable, foreignKey, uuid, text, timestamp, serial, varchar, integer, bigint, bigserial, date, numeric, unique, uniqueIndex, boolean, jsonb, json, primaryKey, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const applyStatus = pgEnum("apply_status", ['pending', 'accepted', 'rejected'])
export const educationLevel = pgEnum("education_level", ['high_school', 'bachelor', 'master', 'phd', 'other'])
export const gender = pgEnum("gender", ['Male', 'Female', 'Other'])
export const jobStatus = pgEnum("job_status", ['draft', 'pending_approval', 'active', 'paused', 'closed', 'rejected'])
export const organizationType = pgEnum("organization_type", ['company', 'school', 'nonprofit', 'university'])
export const provider = pgEnum("provider", ['email', 'google', 'facebook', 'github'])
export const userInteractionType = pgEnum("user_interaction_type", ['save', 'hide'])
export const userStatus = pgEnum("user_status", ['active', 'inactive', 'banned'])
export const workType = pgEnum("work_type", ['remote', 'onsite', 'hybrid'])


export const organizationLocations = pgTable("organization_locations", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	organizationId: uuid("organization_id").notNull(),
	address: text().notNull(),
	provinceId: uuid("province_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.provinceId],
			foreignColumns: [provinces.id],
			name: "organization_locations_province_id_provinces_id_fk"
		}),
]);

export const casbinRule = pgTable("casbin_rule", {
	id: serial().primaryKey().notNull(),
	ptype: varchar({ length: 100 }),
	v0: varchar({ length: 100 }),
	v1: varchar({ length: 100 }),
	v2: varchar({ length: 100 }),
	v3: varchar({ length: 100 }),
	v4: varchar({ length: 100 }),
	v5: varchar({ length: 100 }),
});

export const companies = pgTable("companies", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	logoUrl: varchar("logo_url", { length: 500 }),
	description: text(),
	address: text().array(),
	employeesMin: integer("employees_min"),
	employeesMax: integer("employees_max"),
	websiteUrl: varchar("website_url", { length: 500 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	foundingYear: integer("founding_year"),
	taxCode: varchar("tax_code", { length: 100 }),
	organizationCulture: text("organization_culture"),
	benefits: text(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	companyRawId: bigint("company_raw_id", { mode: "number" }),
	email: varchar({ length: 255 }),
	phone: varchar({ length: 50 }),
	verifiedAt: timestamp("verified_at", { mode: 'string' }),
	organizationId: uuid("organization_id").notNull(),
	companySize: integer("company_size"),
}, (table) => [
	foreignKey({
			columns: [table.companyRawId],
			foreignColumns: [companyRaws.id],
			name: "companies_company_raw_id_company_raws_id_fk"
		}),
]);

export const jobRaws = pgTable("job_raws", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	url: varchar({ length: 500 }),
	datePosted: date("date_posted"),
	skills: text().array(),
	crawledAt: timestamp("crawled_at", { mode: 'string' }).defaultNow().notNull(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	companyId: bigint("company_id", { mode: "number" }).notNull(),
	source: varchar({ length: 255 }).notNull(),
	salaryMin: numeric("salary_min", { precision: 12, scale:  2 }),
	salaryMax: numeric("salary_max", { precision: 12, scale:  2 }),
	provinces: text().array(),
	category: text(),
}, (table) => [
	foreignKey({
			columns: [table.companyId],
			foreignColumns: [companyRaws.id],
			name: "job_raws_company_id_company_raws_id_fk"
		}),
]);

export const skills = pgTable("skills", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
}, (table) => [
	unique("skills_name_unique").on(table.name),
]);

export const companyRaws = pgTable("company_raws", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	logoUrl: varchar("logo_url", { length: 500 }),
	description: text(),
	address: text().array(),
	websiteUrl: varchar("website_url", { length: 500 }),
	source: varchar({ length: 255 }).notNull(),
	crawledAt: timestamp("crawled_at", { mode: 'string' }).defaultNow().notNull(),
	employeesMin: integer("employees_min"),
	employeesMax: integer("employees_max"),
});

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	username: varchar({ length: 255 }).notNull(),
	email: varchar({ length: 255 }),
	emailVerified: boolean("email_verified").default(false).notNull(),
	phone: varchar({ length: 20 }),
	firebaseUid: varchar("firebase_uid", { length: 255 }),
	avatarUrl: varchar("avatar_url", { length: 500 }),
	name: varchar({ length: 255 }).notNull(),
	dob: date(),
	gender: gender(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	bannerUrl: varchar("banner_url", { length: 500 }),
	bio: varchar({ length: 500 }),
	phoneVerified: boolean("phone_verified").default(false).notNull(),
	provider: provider().default('email').notNull(),
	address: varchar({ length: 255 }),
	status: userStatus().default('active').notNull(),
	roles: varchar({ length: 255 }).array().default(["USER"]).notNull(),
}, (table) => [
	uniqueIndex("idx_users_email").using("btree", table.email.asc().nullsLast().op("text_ops")),
	uniqueIndex("idx_users_firebase_uid").using("btree", table.firebaseUid.asc().nullsLast().op("text_ops")),
	uniqueIndex("idx_users_phone").using("btree", table.phone.asc().nullsLast().op("text_ops")),
	unique("users_username_unique").on(table.username),
]);

export const userExperiences = pgTable("user_experiences", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	companyId: uuid("company_id").notNull(),
	position: varchar({ length: 255 }).notNull(),
	startDate: date("start_date").notNull(),
	endDate: date("end_date"),
	jobTitle: varchar("job_title", { length: 255 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	organizationId: uuid("organization_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_experiences_user_id_users_id_fk"
		}),
]);

export const categories = pgTable("categories", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
}, (table) => [
	unique("categories_name_unique").on(table.name),
]);

export const provinces = pgTable("provinces", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
}, (table) => [
	unique("provinces_name_unique").on(table.name),
]);

export const refreshTokens = pgTable("refresh_tokens", {
	id: serial().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	token: varchar().notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	revoked: boolean().default(false).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "refresh_tokens_user_id_users_id_fk"
		}),
]);

export const userOnboardings = pgTable("user_onboardings", {
	id: bigserial({ mode: "bigint" }).primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	educationLevel: educationLevel("education_level"),
	major: varchar({ length: 255 }),
	school: varchar({ length: 255 }),
	currentGoal: varchar("current_goal", { length: 500 }),
	experienceYears: integer("experience_years"),
	experienceDetails: varchar("experience_details", { length: 500 }),
	skills: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_onboardings_user_id_users_id_fk"
		}),
	unique("user_onboardings_user_id_unique").on(table.userId),
]);

export const applyJobs = pgTable("apply_jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	jobId: uuid("job_id").notNull(),
	status: applyStatus().default('pending'),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	cvId: uuid("cv_id"),
	answers: jsonb(),
}, (table) => [
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [jobs.id],
			name: "apply_jobs_job_id_jobs_id_fk"
		}),
	foreignKey({
			columns: [table.cvId],
			foreignColumns: [cvs.id],
			name: "apply_jobs_cv_id_cvs_id_fk"
		}),
]);

export const cvs = pgTable("cvs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	fileUrl: varchar("file_url", { length: 500 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	fileName: varchar("file_name", { length: 255 }).notNull(),
	mimeType: varchar("mime_type", { length: 255 }).notNull(),
	lastUsedAt: timestamp("last_used_at", { mode: 'string' }).defaultNow(),
	name: varchar({ length: 255 }).notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "cvs_user_id_users_id_fk"
		}),
]);

export const userInteractions = pgTable("user_interactions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	jobId: uuid("job_id").notNull(),
	type: userInteractionType().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [jobs.id],
			name: "user_interactions_job_id_jobs_id_fk"
		}),
]);

export const jobs = pgTable("jobs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: json(),
	companyId: uuid("company_id").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	salaryMin: numeric("salary_min", { precision: 12, scale:  2 }),
	salaryMax: numeric("salary_max", { precision: 12, scale:  2 }),
	datePosted: date("date_posted"),
	experienceMin: integer("experience_min"),
	experienceMax: integer("experience_max"),
	provinceId: uuid("province_id"),
	endDate: date("end_date"),
	status: jobStatus().default('draft').notNull(),
	workType: workType("work_type"),
	questions: jsonb(),
	// You can use { mode: "bigint" } if numbers are exceeding js number limitations
	jobRawId: bigint("job_raw_id", { mode: "number" }),
	rejectReason: text("reject_reason"),
}, (table) => [
	foreignKey({
			columns: [table.provinceId],
			foreignColumns: [provinces.id],
			name: "jobs_province_id_provinces_id_fk"
		}),
	foreignKey({
			columns: [table.jobRawId],
			foreignColumns: [jobRaws.id],
			name: "jobs_job_raw_id_job_raws_id_fk"
		}),
]);

export const organizationMembers = pgTable("organization_members", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	organizationId: uuid("organization_id").notNull(),
	role: varchar({ length: 100 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
	organizationName: varchar("organization_name", { length: 255 }).notNull(),
	organizationType: organizationType("organization_type").notNull(),
	organizationEmail: varchar("organization_email", { length: 255 }),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "organization_members_user_id_users_id_fk"
		}),
]);

export const universities = pgTable("universities", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
}, (table) => [
	unique("universities_name_unique").on(table.name),
]);

export const jobSkills = pgTable("job_skills", {
	jobId: uuid("job_id").notNull(),
	skillId: uuid("skill_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [jobs.id],
			name: "job_skills_job_id_jobs_id_fk"
		}),
	foreignKey({
			columns: [table.skillId],
			foreignColumns: [skills.id],
			name: "job_skills_skill_id_skills_id_fk"
		}),
	primaryKey({ columns: [table.jobId, table.skillId], name: "job_skills_job_id_skill_id_pk"}),
]);

export const jobCategories = pgTable("job_categories", {
	jobId: uuid("job_id").notNull(),
	categoryId: uuid("category_id").notNull(),
}, (table) => [
	foreignKey({
			columns: [table.jobId],
			foreignColumns: [jobs.id],
			name: "job_categories_job_id_jobs_id_fk"
		}),
	foreignKey({
			columns: [table.categoryId],
			foreignColumns: [categories.id],
			name: "job_categories_category_id_categories_id_fk"
		}),
	primaryKey({ columns: [table.jobId, table.categoryId], name: "job_categories_job_id_category_id_pk"}),
]);

export const userSkills = pgTable("user_skills", {
	userId: uuid("user_id").notNull(),
	skillId: uuid("skill_id").notNull(),
	companyId: uuid("company_id"),
	organizationId: uuid("organization_id"),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "user_skills_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.skillId],
			foreignColumns: [skills.id],
			name: "user_skills_skill_id_skills_id_fk"
		}),
	primaryKey({ columns: [table.userId, table.skillId], name: "user_skills_user_id_skill_id_pk"}),
]);
