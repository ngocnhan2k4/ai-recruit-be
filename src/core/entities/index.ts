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
  universities,
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
import { NotificationType } from "./enum.entity";
import { organizationLocations } from "drizzle/migrations/schema";
export * from "./enum.entity";

// Because Drizzle ORM support type inference, we can create types based on the table schema
// This way, we ensure that our types are always in sync with the database schema
export type NewCompany = InferInsertModel<typeof companies>;
export type Company = InferSelectModel<typeof companies>;

export type NewSchool = InferInsertModel<typeof schools>;
export type School = InferSelectModel<typeof schools>;

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

export type NewUniversity = InferInsertModel<typeof universities>;
export type University = InferSelectModel<typeof universities>;

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

export type NewOrganization = InferInsertModel<typeof organizations> & {
  locations?: Pick<OrganizationLocation, "address" | "provinceId">[];
  companyDetails?: Omit<NewCompany, "organizationId">;
  schoolDetails?: Omit<NewSchool, "organizationId">;
};
export type Organization = InferSelectModel<typeof organizations>;
export type OrganizationWithDetails = InferSelectModel<typeof organizations> & {
  companySize: number | null;
  taxCode: string | null;
  benefits: string | null;
  companyRawId: number | null;
};
export type OrganizationLocation = InferSelectModel<
  typeof organizationLocations
>;
export type NewOrganizationLocation = InferInsertModel<
  typeof organizationLocations
>;
