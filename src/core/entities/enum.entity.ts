export enum JobStatusEnum {
  DRAFT = "draft",
  PENDING_APPROVAL = "pending_approval",
  ACTIVE = "active",
  PAUSED = "paused",
  CLOSED = "closed",
  REJECTED = "rejected",
}
export enum ApplyStatusEnum {
  PENDING = "pending",
  ACCEPTED = "accepted",
  REJECTED = "rejected",
}
export enum WorkTypeEnum {
  REMOTE = "remote",
  ONSITE = "onsite",
  HYBRID = "hybrid",
}
export enum GenderEnum {
  MALE = "male",
  FEMALE = "female",
  OTHER = "other",
}
export enum OrganizationTypeEnum {
  COMPANY = "company",
  SCHOOL = "school",
  NONPROFIT = "nonprofit",
  UNIVERSITY = "university",
}
export enum EducationLevelEnum {
  HIGH_SCHOOL = "high_school",
  BACHELOR = "bachelor",
  MASTER = "master",
  PHD = "phd",
  OTHER = "other",
}
export enum ProviderEnum {
  EMAIL = "email",
  GOOGLE = "google",
  FACEBOOK = "facebook",
  GITHUB = "github",
}
export enum UserStatusEnum {
  ACTIVE = "active",
  INACTIVE = "inactive",
  BANNED = "banned",
}
