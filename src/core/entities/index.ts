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
  cvs,
  ProviderEnum,
  EducationLevelEnum,
  GenderEnum,
  universities,
  userOnboardings,
  organizationMembers,
  JobStatusEnum,
  UserStatusEnum,
  WorkTypeEnum,
  UserInteractionTypeEnum,
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
export type UserInteractionTypeEnumType =
  (typeof UserInteractionTypeEnum.enumValues)[number];

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

export type NewUniversity = InferInsertModel<typeof universities>;
export type University = InferSelectModel<typeof universities>;

export type NewCv = InferInsertModel<typeof cvs>;
export type Cv = InferSelectModel<typeof cvs>;
export type ProviderEnumType = (typeof ProviderEnum.enumValues)[number];
export type EducationLevelEnumType =
  (typeof EducationLevelEnum.enumValues)[number];
export type GenderEnumType = (typeof GenderEnum.enumValues)[number];
export type JobStatusEnumType = (typeof JobStatusEnum.enumValues)[number];
export type UserStatusEnumType = (typeof UserStatusEnum.enumValues)[number];
export type WorkTypeEnumType = (typeof WorkTypeEnum.enumValues)[number];

export type NewUserOnboarding = InferInsertModel<typeof userOnboardings>;
export type UserOnboarding = InferSelectModel<typeof userOnboardings>;

export type OrganizationMember = InferSelectModel<typeof organizationMembers>;
export type NewOrganizationMember = InferInsertModel<
  typeof organizationMembers
>;
