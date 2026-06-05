import { OrganizationTypeEnum } from "@/core";
import { pgEnum } from "drizzle-orm/pg-core";

export const GenderEnum = pgEnum("gender", ["Male", "Female", "Other"]);
export const EducationLevelEnum = pgEnum("education_level", [
  "high_school",
  "bachelor",
  "master",
  "phd",
  "other",
]);
export const ProviderEnum = pgEnum("provider", [
  "email",
  "google",
  "facebook",
  "github",
]);
export const UserStatusEnum = pgEnum("user_status", [
  "active",
  // "inactive",
  "banned",
  "pending_deletion",
  "deleted",
]);

export const organizationTypeEnum = pgEnum("organization_type", [
  OrganizationTypeEnum.COMPANY,
  OrganizationTypeEnum.SCHOOL,
  OrganizationTypeEnum.NONPROFIT,
  OrganizationTypeEnum.UNIVERSITY,
]);

export const JobStatusEnum = pgEnum("job_status", [
  "pending_approval",
  "active",
  "paused",
  "closed",
  "rejected",
]);

export const ApplyStatusEnum = pgEnum("apply_status", [
  "pending",
  "accepted",
  "rejected",
]);

export const WorkTypeEnum = pgEnum("work_type", ["remote", "onsite", "hybrid"]);
export const SchoolTypeEnum = pgEnum("school_type", [
  "college",
  "university",
  "highschool",
  "secondary",
  "primary",
]);
export const NotificationTypeEnum = pgEnum("notification_type", [
  "job_posted",
  "job_updated",
  "job_approved",
  "admin_job_approved",
  "admin_job_rejected",
  "job_applied",
  "job_matched",
  "profile_viewed",
  "cv_approved",
  "cv_rejected",
  "organization_invitation",
  "system",
  "feedback_assigned",
  "blog_comment",
  "blog_comment_reply",
]);
export const OrganizationRoleEnum = pgEnum("organization_role", [
  "organization_owner",
  "organization_admin",
  // "organization_editor",
  "organization_viewer",
  // "organization_content_admin",
  // "organization_content_editor",
  // "organization_content_viewer",
  // "organization_recruiter_admin",
  // "organization_recruiter_editor",
  // "organization_recruiter_viewer",
  // "organization_analyst_admin",
  // "organization_analyst_editor",
  // "organization_analyst_viewer",
  // "organization_employee",
  "anonymously",
]);

export const FeedbackStatusEnum = pgEnum("feedback_status", [
  "pending",
  "read",
  "resolved",
]);

export const FeedbackTypeEnum = pgEnum("feedback_type", ["feedback", "survey"]);

export const OrganizationInviteStatusEnum = pgEnum(
  "organization_invite_status",
  ["pending", "accepted", "declined"],
);
export const OrganizationInviteTypeEnum = pgEnum("organization_invite_type", [
  "outgoing", // from the organization's perspective
  "incoming", // from the user's perspective
]);

export const PgSkillLevelEnum = pgEnum("skill_level", [
  "beginner",
  "intermediate",
  "advanced",
]);

export const ResourceTypeEnum = pgEnum("resource_type", [
  "video",
  "course",
  "article",
  "book",
  "documentation",
]);

export const GapDifficultyEnum = pgEnum("gap_difficulty", [
  "easy",
  "medium",
  "hard",
]);

export const LanguageEnum = pgEnum("language", ["vi", "en"]);

export const TemplateEnum = pgEnum("cv_template", [
  "classic",
  "modern-blue",
  "modern-green",
]);

export const UserInteractionTypeEnum = pgEnum("user_interaction_type", [
  "save",
  // [TODO] remove later
  //"hide",
]);

export const BillingCycleSubscriptionEnum = pgEnum(
  "billing_cycle_subscription",
  ["monthly", "yearly"],
);

export const UserSubscriptionStatusEnum = pgEnum("user_subscription_status", [
  "pending_activation",
  "active",
  "canceled",
  // "expired",
]);

export const FeatureCodeEnum = pgEnum("FeatureCodeEnum", [
  "learning_path",
  "cv",
  "suggest_cv_field",
  "optimize_cv",
  "save_job",
]);

export const SubscriptionEnum = pgEnum("SubscriptionEnum", [
  "FREE",
  "BASIC",
  "PRO",
  "ENTERPRISE",
]);

export const TaskStatusEnum = pgEnum("task_status", [
  "pending",
  "in_progress",
  "completed",
  "failed",
]);

export const TaskTypeEnum = pgEnum("task_type", [
  "learning_path_generation",
  "cv_generation",
]);

export const BlogPostStatusEnum = pgEnum("blog_post_status", [
  "DRAFT",
  "PENDING",
  "PUBLISHED",
  "REJECTED",
]);

export const BlogPostSourceTypeEnum = pgEnum("blog_post_source_type", [
  "USER",
  "AI",
  "CRAWLED",
]);

export const ActionTypeEnum = pgEnum("action", ["LIKE", "SAVE"]);

export const ObjectTypeEnum = pgEnum("object_type", ["BLOG", "ORG"]);
