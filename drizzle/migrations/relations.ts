import { relations } from "drizzle-orm/relations";
import { users, userExperiences, companies, userOnboardings, companyRaws, jobRaws, jobs, userSkills, skills, jobCategories, categories, jobSkills } from "./schema";

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

export const usersRelations = relations(users, ({many}) => ({
	userExperiences: many(userExperiences),
	userOnboardings: many(userOnboardings),
	userSkills: many(userSkills),
}));

export const companiesRelations = relations(companies, ({many}) => ({
	userExperiences: many(userExperiences),
	jobs: many(jobs),
}));

export const userOnboardingsRelations = relations(userOnboardings, ({one}) => ({
	user: one(users, {
		fields: [userOnboardings.userId],
		references: [users.id]
	}),
}));

export const jobRawsRelations = relations(jobRaws, ({one}) => ({
	companyRaw: one(companyRaws, {
		fields: [jobRaws.companyId],
		references: [companyRaws.id]
	}),
}));

export const companyRawsRelations = relations(companyRaws, ({many}) => ({
	jobRaws: many(jobRaws),
}));

export const jobsRelations = relations(jobs, ({one, many}) => ({
	company: one(companies, {
		fields: [jobs.companyId],
		references: [companies.id]
	}),
	jobCategories: many(jobCategories),
	jobSkills: many(jobSkills),
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

export const skillsRelations = relations(skills, ({many}) => ({
	userSkills: many(userSkills),
	jobSkills: many(jobSkills),
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