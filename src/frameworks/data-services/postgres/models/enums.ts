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
  "inactive",
  "banned",
]);

export const organizationTypeEnum = pgEnum("organization_type", [
  OrganizationTypeEnum.COMPANY,
  OrganizationTypeEnum.SCHOOL,
  OrganizationTypeEnum.NONPROFIT,
  OrganizationTypeEnum.UNIVERSITY,
]);

export const JobStatusEnum = pgEnum("job_status", [
  "draft",
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
  "job_approved",
  "job_applied",
  "job_matched",
  "profile_viewed",
  "system",
]);
export const OrganizationRoleEnum = pgEnum("organization_role", [
  "organization_owner",
  "organization_admin",
  "organization_editor",
  "organization_viewer",
  "organization_content_admin",
  "organization_content_editor",
  "organization_content_viewer",
  "organization_recruiter_admin",
  "organization_recruiter_editor",
  "organization_recruiter_viewer",
  "organization_analyst_admin",
  "organization_analyst_editor",
  "organization_analyst_viewer",
  "organization_employee",
  "anonymously",
]);
