import {
  aiCvs,
  applyJobs,
  areas,
  candidateBriefs,
  categories,
  comments,
  companies,
  cvs,
  features,
  feedbacks,
  jobCopilotDrafts,
  jobCopilotConversations,
  jobCopilotMessages,
  jobProvinces,
  jobs,
  notifications,
  organizationInvitations,
  organizationLocations,
  organizationMembers,
  organizations,
  provinces,
  questions,
  refreshTokens,
  schools,
  skillNotes,
  skills,
  skillsSynonyms,
  subscriptionFeatures,
  subscriptions,
  tasks,
  userActions,
  userAnswers,
  userEducations,
  userExperiences,
  userFeatureUsages,
  userIdentities,
  userNotifications,
  userOnboardings,
  users,
  userSkills,
  userSubscriptions,
  userTests,
} from "@/frameworks/data-services/postgres/models";
import {
  blogCategories,
  blogPosts,
  blogPostTags,
  tags,
} from "@/frameworks/data-services/postgres/models/blog.model";
import { InferInsertModel, InferSelectModel } from "drizzle-orm";
import { OptimizedCvData } from "./ai-cv.entity";
import { SchoolTypeEnum } from "./enum.entity";
export * from "./ai-cv.entity";
export * from "./blog.entity";
export * from "./candidate-brief.entity";
export * from "./comment.entity";
export * from "./cv.entity";
export * from "./email.entity";
export * from "./enum.entity";
export * from "./feedback.entity";
export * from "./job-copilot-draft.entity";
export * from "./job-copilot.entity";
export * from "./job-copilot-conversation.entity";
export * from "./job-salary-insight.entity";
export * from "./job.entity";
export * from "./learning-path.entity";
export * from "./organization.entity";
export * from "./otp.entity";
export * from "./skill.entity";
export * from "./subscription.entity";
export * from "./task.entity";
export * from "./user.entity";

// Because Drizzle ORM support type inference, we can create types based on the table schema
// This way, we ensure that our types are always in sync with the database schema

export type NewCategory = InferInsertModel<typeof categories>;
export type Category = InferSelectModel<typeof categories>;

export type NewJob = InferInsertModel<typeof jobs>;
export type Job = InferSelectModel<typeof jobs> & {
  questions?: string[];
};

export type NewJobCopilotDraft = InferInsertModel<typeof jobCopilotDrafts>;
export type NewJobCopilotConversation = InferInsertModel<
  typeof jobCopilotConversations
>;
export type NewJobCopilotMessage = InferInsertModel<typeof jobCopilotMessages>;
export type NewCandidateBrief = InferInsertModel<typeof candidateBriefs>;

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

export type NewTask = InferInsertModel<typeof tasks>;
export type Task = InferSelectModel<typeof tasks>;

export type NewSkillSynonym = InferInsertModel<typeof skillsSynonyms>;
export type SkillSynonym = InferSelectModel<typeof skillsSynonyms>;

export type NewCv = InferInsertModel<typeof cvs>;
export type Cv = InferSelectModel<typeof cvs>;

export type NewAiCv = InferInsertModel<typeof aiCvs> & {
  cvData?: OptimizedCvData;
};
export type AiCv = InferSelectModel<typeof aiCvs> & {
  cvData: OptimizedCvData;
};

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
    displayLanguage?: string | null;
    task?: Pick<Task, "id" | "status" | "type" | "result"> | null;
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
  activeJobsCount?: number;
  totalMembersCount?: number;
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
export type UserSubscription = InferSelectModel<typeof userSubscriptions>;

export type NewSubscriptionFeature = InferInsertModel<
  typeof subscriptionFeatures
>;
export type SubscriptionFeature = InferSelectModel<typeof subscriptionFeatures>;

export type NewUserFeatureUsage = InferInsertModel<typeof userFeatureUsages>;
export type UserFeatureUsage = InferSelectModel<typeof userFeatureUsages>;

export type NewBlogPostTag = InferInsertModel<typeof blogPostTags>;
export type BlogPostTag = InferSelectModel<typeof blogPostTags>;

export type NewBlogPost = InferInsertModel<typeof blogPosts> & {
  tags: {
    tagId?: string | null;
    skillId?: string | null;
  }[];
};
export type BlogPost = InferSelectModel<typeof blogPosts> & BlogPostTag;

export type NewComment = InferInsertModel<typeof comments>;
export type Comment = InferSelectModel<typeof comments>;

export type NewUserAction = InferInsertModel<typeof userActions>;
export type UserAction = InferSelectModel<typeof userActions>;

export type SkillNote = InferSelectModel<typeof skillNotes>;
export type NewSkillNote = InferInsertModel<typeof skillNotes>;

export type NewBlogCategory = InferInsertModel<typeof blogCategories>;
export type BlogCategory = InferSelectModel<typeof blogCategories>;

export type NewTag = InferInsertModel<typeof tags>;
export type Tag = InferSelectModel<typeof tags>;
