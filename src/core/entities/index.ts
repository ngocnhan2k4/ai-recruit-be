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
  userEducations,
  feedbacks,
  jobProvinces,
  areas,
  questions,
  levels,
  userTests,
  userAnswers,
  importLogs,
  applyJobs,
} from "@/frameworks/data-services/postgres/models";
import {
  notifications,
  userNotifications,
} from "@/frameworks/data-services/postgres/models/notification.model";
import {
  organizationInvitations,
  organizationLocations,
  organizations,
} from "@/frameworks/data-services/postgres/models/organization.model";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { SchoolTypeEnum } from "./enum.entity";
export * from "./enum.entity";
export * from "./learning-path.entity";
export * from "./otp.entity";
export * from "./ai-cv.entity";
export * from "./user.entity";
export * from "./job.entity";
export * from "./organization.entity";

// Because Drizzle ORM support type inference, we can create types based on the table schema
// This way, we ensure that our types are always in sync with the database schema

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
  UserNotification & {
    senderName?: string | null;
    senderAvatarUrl?: string | null;
    organizationName?: string | null;
    organizationLogoUrl?: string | null;
  };

type Organization = InferSelectModel<typeof organizations>;
type NewOrganization = InferInsertModel<typeof organizations>;

export type OrganizationLocation = InferSelectModel<
  typeof organizationLocations
> & {
  provinceName?: string | null;
};
export type NewOrganizationLocation = InferInsertModel<
  typeof organizationLocations
>;

export type OrganizationWithDetails = Organization & {
  companySize?: number | null;
  taxCode?: string | null;
  benefits?: string | null;
  companyRawId?: number | null;
  schoolType?: SchoolTypeEnum | null;
  culture?: string | null;
  locations?: OrganizationLocation[];
};

export type NewOrganizationWithDetails = NewOrganization & {
  // companySize?: number | null;
  // taxCode?: string | null;
  // benefits?: string | null;
  // companyRawId?: number | null;
  // schoolType?: SchoolTypeEnum | null;
  // culture?: string | null;
  // locations?: NewOrganizationLocation[];
};

export type Company = InferSelectModel<typeof companies> & {
  locations?: OrganizationLocation[];
} & Organization;

export type NewCompany = InferInsertModel<typeof companies>;

export type School = InferSelectModel<typeof schools> & {
  locations?: OrganizationLocation[];
} & Organization;

export type NewSchool = InferInsertModel<typeof schools>;

export type OrganizationMemberInvitation = InferSelectModel<
  typeof organizationInvitations
>;

export type NewOrganizationMemberInvitation = InferInsertModel<
  typeof organizationInvitations
>;

export type NewUserEducation = InferInsertModel<typeof userEducations>;
export type UserEducation = InferSelectModel<typeof userEducations>;

export type NewFeedback = InferInsertModel<typeof feedbacks>;
export type Feedback = InferSelectModel<typeof feedbacks>;

export type JobProvince = InferSelectModel<typeof jobProvinces>;

// Exam System entities
export type NewArea = InferInsertModel<typeof areas>;
export type Area = InferSelectModel<typeof areas>;

export type NewQuestion = InferInsertModel<typeof questions>;
export type Question = InferSelectModel<typeof questions>;

export type NewLevel = InferInsertModel<typeof levels>;
export type Level = InferSelectModel<typeof levels>;

export type NewUserTest = InferInsertModel<typeof userTests>;
export type UserTest = InferSelectModel<typeof userTests>;

export type NewUserAnswer = InferInsertModel<typeof userAnswers>;
export type UserAnswer = InferSelectModel<typeof userAnswers>;

export type NewImportLog = InferInsertModel<typeof importLogs>;
export type ImportLog = InferSelectModel<typeof importLogs>;

export type NewApplyJob = InferInsertModel<typeof applyJobs>;
export type ApplyJob = InferSelectModel<typeof applyJobs>;
