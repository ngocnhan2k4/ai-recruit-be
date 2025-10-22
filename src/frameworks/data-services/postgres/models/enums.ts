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
