import { relations } from "drizzle-orm/relations";
import { provinces, organizationLocations, companyRaws, companies, jobRaws, users, userExperiences, refreshTokens, userOnboardings, jobs, applyJobs, cvs, userInteractions, organizationMembers, jobSkills, skills, jobCategories, categories, userSkills } from "./schema";

export const organizationLocationsRelations = relations(organizationLocations, ({one}) => ({
	province: one(provinces, {
		fields: [organizationLocations.provinceId],
		references: [provinces.id]
	}),
}));

export const provincesRelations = relations(provinces, ({many}) => ({
	organizationLocations: many(organizationLocations),
	jobs: many(jobs),
}));

export const companiesRelations = relations(companies, ({one}) => ({
	companyRaw: one(companyRaws, {
		fields: [companies.companyRawId],
		references: [companyRaws.id]
	}),
}));

export const companyRawsRelations = relations(companyRaws, ({many}) => ({
	companies: many(companies),
	jobRaws: many(jobRaws),
}));

export const jobRawsRelations = relations(jobRaws, ({one, many}) => ({
	companyRaw: one(companyRaws, {
		fields: [jobRaws.companyId],
		references: [companyRaws.id]
	}),
	jobs: many(jobs),
}));

export const userExperiencesRelations = relations(userExperiences, ({one}) => ({
	user: one(users, {
		fields: [userExperiences.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({many}) => ({
	userExperiences: many(userExperiences),
	refreshTokens: many(refreshTokens),
	userOnboardings: many(userOnboardings),
	cvs: many(cvs),
	organizationMembers: many(organizationMembers),
	userSkills: many(userSkills),
}));

export const refreshTokensRelations = relations(refreshTokens, ({one}) => ({
	user: one(users, {
		fields: [refreshTokens.userId],
		references: [users.id]
	}),
}));

export const userOnboardingsRelations = relations(userOnboardings, ({one}) => ({
	user: one(users, {
		fields: [userOnboardings.userId],
		references: [users.id]
	}),
}));

export const applyJobsRelations = relations(applyJobs, ({one}) => ({
	job: one(jobs, {
		fields: [applyJobs.jobId],
		references: [jobs.id]
	}),
	cv: one(cvs, {
		fields: [applyJobs.cvId],
		references: [cvs.id]
	}),
}));

export const jobsRelations = relations(jobs, ({one, many}) => ({
	applyJobs: many(applyJobs),
	userInteractions: many(userInteractions),
	province: one(provinces, {
		fields: [jobs.provinceId],
		references: [provinces.id]
	}),
	jobRaw: one(jobRaws, {
		fields: [jobs.jobRawId],
		references: [jobRaws.id]
	}),
	jobSkills: many(jobSkills),
	jobCategories: many(jobCategories),
}));

export const cvsRelations = relations(cvs, ({one, many}) => ({
	applyJobs: many(applyJobs),
	user: one(users, {
		fields: [cvs.userId],
		references: [users.id]
	}),
}));

export const userInteractionsRelations = relations(userInteractions, ({one}) => ({
	job: one(jobs, {
		fields: [userInteractions.jobId],
		references: [jobs.id]
	}),
}));

export const organizationMembersRelations = relations(organizationMembers, ({one}) => ({
	user: one(users, {
		fields: [organizationMembers.userId],
		references: [users.id]
	}),
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