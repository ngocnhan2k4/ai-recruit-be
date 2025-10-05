import { relations } from "drizzle-orm/relations";
import { companyRaws, jobRaws, users, userOnboardings, refreshTokens, userExperiences, companies, jobs, applyJobs, userCv, userInteractions, provinces, jobCategories, categories, jobSkills, skills, userSkills } from "./schema";

export const jobRawsRelations = relations(jobRaws, ({one}) => ({
	companyRaw: one(companyRaws, {
		fields: [jobRaws.companyId],
		references: [companyRaws.id]
	}),
}));

export const companyRawsRelations = relations(companyRaws, ({many}) => ({
	jobRaws: many(jobRaws),
}));

export const userOnboardingsRelations = relations(userOnboardings, ({one}) => ({
	user: one(users, {
		fields: [userOnboardings.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	userOnboardings: many(userOnboardings),
	refreshTokens: many(refreshTokens),
	userExperiences: many(userExperiences),
	userSkills: many(userSkills),
}));

export const refreshTokensRelations = relations(refreshTokens, ({one}) => ({
	user: one(users, {
		fields: [refreshTokens.userId],
		references: [users.id]
	}),
}));

export const userExperiencesRelations = relations(userExperiences, ({one}) => ({
	user: one(users, {
		fields: [userExperiences.userId],
		references: [users.id]
	}),
	company: one(companies, {
		fields: [userExperiences.companyId],
		references: [companies.id]
	}),
}));

export const companiesRelations = relations(companies, ({many}) => ({
	userExperiences: many(userExperiences),
	jobs: many(jobs),
}));

export const applyJobsRelations = relations(applyJobs, ({one}) => ({
	job: one(jobs, {
		fields: [applyJobs.jobId],
		references: [jobs.id]
	}),
	userCv: one(userCv, {
		fields: [applyJobs.userCvId],
		references: [userCv.id]
	}),
}));

export const jobsRelations = relations(jobs, ({one, many}) => ({
	applyJobs: many(applyJobs),
	userInteractions: many(userInteractions),
	company: one(companies, {
		fields: [jobs.companyId],
		references: [companies.id]
	}),
	province: one(provinces, {
		fields: [jobs.provinceId],
		references: [provinces.id]
	}),
	jobCategories: many(jobCategories),
	jobSkills: many(jobSkills),
}));

export const userCvRelations = relations(userCv, ({many}) => ({
	applyJobs: many(applyJobs),
}));

export const userInteractionsRelations = relations(userInteractions, ({one}) => ({
	job: one(jobs, {
		fields: [userInteractions.jobId],
		references: [jobs.id]
	}),
}));

export const provincesRelations = relations(provinces, ({many}) => ({
	jobs: many(jobs),
}));

export const jobCategoriesRelations = relations(jobCategories, ({one}) => ({
	job: one(jobs, {
		fields: [jobCategories.jobId],
		references: [jobs.id]
	}),
	category: one(categories, {
		fields: [jobCategories.categoryId],
		references: [categories.id]
	}),
}));

export const categoriesRelations = relations(categories, ({many}) => ({
	jobCategories: many(jobCategories),
}));

export const jobSkillsRelations = relations(jobSkills, ({one}) => ({
	job: one(jobs, {
		fields: [jobSkills.jobId],
		references: [jobs.id]
	}),
	skill: one(skills, {
		fields: [jobSkills.skillId],
		references: [skills.id]
	}),
}));

export const skillsRelations = relations(skills, ({many}) => ({
	jobSkills: many(jobSkills),
	userSkills: many(userSkills),
}));

export const userSkillsRelations = relations(userSkills, ({one}) => ({
	user: one(users, {
		fields: [userSkills.userId],
		references: [users.id]
	}),
	skill: one(skills, {
		fields: [userSkills.skillId],
		references: [skills.id]
	}),
}));