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
  userOnboardings,
  organizationMembers,
  schools,
} from "@/frameworks/data-services/postgres/models";
import {
  notifications,
  userNotifications,
} from "@/frameworks/data-services/postgres/models/notification.model";
import { organizations } from "@/frameworks/data-services/postgres/models/organization.model";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { SchoolTypeEnum } from "./enum.entity";
export * from "./enum.entity";

// Because Drizzle ORM support type inference, we can create types based on the table schema
// This way, we ensure that our types are always in sync with the database schema

export type NewCategory = InferInsertModel<typeof categories>;
export type Category = InferSelectModel<typeof categories>;

export type NewJob = InferInsertModel<typeof jobs>;
export type Job = InferSelectModel<typeof jobs> & {
  questions: string[] | null;
  applyUrl?: string | null;
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

export type NewCv = InferInsertModel<typeof cvs>;
export type Cv = InferSelectModel<typeof cvs>;

export type NewUserOnboarding = InferInsertModel<typeof userOnboardings>;
export type UserOnboarding = InferSelectModel<typeof userOnboardings>;

export type OrganizationMember = InferSelectModel<typeof organizationMembers>;
export type NewOrganizationMember = InferInsertModel<
  typeof organizationMembers
>;

export type NewUserNotification = InferInsertModel<typeof userNotifications>;
export type UserNotification = InferSelectModel<typeof userNotifications>;

export type NewNotification = InferInsertModel<typeof notifications>;
export type Notification = InferSelectModel<typeof notifications> &
  UserNotification;

type Organization = InferSelectModel<typeof organizations>;

export type OrganizationWithDetails = Organization & {
  companySize?: number | null;
  taxCode?: string | null;
  benefits?: string | null;
  companyRawId?: number | null;
  schoolType?: SchoolTypeEnum | null;
  culture?: string | null;
  locations?: {
    address?: string;
    provinceId?: string;
  }[];
};

// export type NewCompany = InferInsertModel<typeof companies> & {
//   locations?: {
//     address?: string;
//     provinceId?: string;
//   }[];
// };
export type Company = InferSelectModel<typeof companies> & {
  locations?: {
    address?: string;
    provinceId?: string;
  }[];
} & Organization;

export type School = InferSelectModel<typeof schools> & Organization;
