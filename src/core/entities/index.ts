import {
  companies,
  categories,
  jobs,
  provinces,
  refreshTokens,
  users,
  skills,
  userExperiences,
  userSkills,
  userCV,
} from "@/frameworks/data-services/postgres/models";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";

// Because Drizzle ORM support type inference, we can create types based on the table schema
// This way, we ensure that our types are always in sync with the database schema
export type NewCompany = InferInsertModel<typeof companies>;
export type Company = InferSelectModel<typeof companies>;

export type NewCategory = InferInsertModel<typeof categories>;
export type Category = InferSelectModel<typeof categories>;

export type NewJob = InferInsertModel<typeof jobs>;
export type Job = InferSelectModel<typeof jobs> & {
  questions?: string[];
};

export type NewProvince = InferInsertModel<typeof provinces>;
export type Province = InferSelectModel<typeof provinces>;

export type NewRefreshToken = InferInsertModel<typeof refreshTokens>;
export type RefreshToken = InferSelectModel<typeof refreshTokens>;

export type NewUserExperience = InferInsertModel<typeof userExperiences>;
export type UserExperience = InferSelectModel<typeof userExperiences>;

export type NewUserSkill = InferInsertModel<typeof userSkills>;
export type UserSkill = InferSelectModel<typeof userSkills>;

export type NewUser = InferInsertModel<typeof users>;
export type User = InferSelectModel<typeof users>;

export type NewSkill = InferInsertModel<typeof skills>;
export type Skill = InferSelectModel<typeof skills>;

export type NewCv = InferInsertModel<typeof userCV>;
export type Cv = InferSelectModel<typeof userCV>;

export * from "./job.entity";
