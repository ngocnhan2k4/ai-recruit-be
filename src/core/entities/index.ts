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
  userTests,
  userAnswers,
  applyJobs,
  organizationInvitations,
  organizationLocations,
  organizations,
  notifications,
  userNotifications,
  features,
  subscriptions,
  userSubscriptions,
  subscriptionFeatures,
  userFeatureUsages,
  userIdentities,
  aiCvs,
} from "@/frameworks/data-services/postgres/models";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { SchoolTypeEnum } from "./enum.entity";
import { skillsSynonyms } from "@/frameworks/data-services/postgres/models/skills-synonyms.model";
export * from "./enum.entity";
export * from "./learning-path.entity";
export * from "./otp.entity";
export * from "./ai-cv.entity";
export * from "./user.entity";
export * from "./job.entity";
export * from "./organization.entity";
export * from "./feedback.entity";
export * from "./skill.entity";
export * from "./subscription.entity";

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
export type UserIdentity = InferSelectModel<typeof userIdentities>;
export type NewUserIdentity = InferInsertModel<typeof userIdentities>;

export type NewSkill = InferInsertModel<typeof skills>;
export type Skill = InferSelectModel<typeof skills>;
export type UserTestSkill = Pick<Skill, "id" | "name">;

export type NewSkillSynonym = InferInsertModel<typeof skillsSynonyms>;
export type SkillSynonym = InferSelectModel<typeof skillsSynonyms>;

export type NewCv = InferInsertModel<typeof cvs>;
export type Cv = InferSelectModel<typeof cvs>;

export type NewAiCv = InferInsertModel<typeof aiCvs>;
export type AiCv = InferSelectModel<typeof aiCvs>;

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
    sender?: {
      name?: string | null;
      avatarUrl?: string | null;
    } | null;
    organization?: {
      name?: string | null;
      logoUrl?: string | null;
    } | null;
    orgInvitation?: {
      status: string;
    } | null;
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

export type NewUserTest = InferInsertModel<typeof userTests>;
export type UserTest = InferSelectModel<typeof userTests> & {
  selectedSkills?: UserTestSkill[];
};

export type NewUserAnswer = InferInsertModel<typeof userAnswers>;
export type UserAnswer = InferSelectModel<typeof userAnswers>;

export type NewApplyJob = InferInsertModel<typeof applyJobs>;
export type ApplyJob = InferSelectModel<typeof applyJobs>;

export type NewFeature = InferInsertModel<typeof features>;
export type Feature = InferSelectModel<typeof features>;

export type NewSubscription = InferInsertModel<typeof subscriptions>;
export type Subscription = InferSelectModel<typeof subscriptions>;

export type NewUserSubscription = InferInsertModel<typeof userSubscriptions>;
export type UserSubscription = InferSelectModel<typeof userSubscriptions> & {
  user: Pick<User, "id" | "name" | "username" | "email" | "avatarUrl">;
  subscription: Pick<
    Subscription,
    "id" | "name" | "price" | "billingCycle" | "isActive"
  >;
};

export type NewSubscriptionFeature = InferInsertModel<
  typeof subscriptionFeatures
>;
export type SubscriptionFeature = InferSelectModel<typeof subscriptionFeatures>;

export type NewUserFeatureUsage = InferInsertModel<typeof userFeatureUsages>;
export type UserFeatureUsage = InferSelectModel<typeof userFeatureUsages>;
