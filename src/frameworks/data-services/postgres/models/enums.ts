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

export enum OrganizationTypeEnum {
  COMPANY = "company",
  SCHOOL = "school",
  NONPROFIT = "nonprofit",
  UNIVERSITY = "university",
}

export const organizationTypeEnum = pgEnum("organization_type", [
  OrganizationTypeEnum.COMPANY,
  OrganizationTypeEnum.SCHOOL,
  OrganizationTypeEnum.NONPROFIT,
  OrganizationTypeEnum.UNIVERSITY,
]);
