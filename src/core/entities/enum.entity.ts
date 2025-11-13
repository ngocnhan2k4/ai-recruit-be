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
  MALE = "Male",
  FEMALE = "Female",
  OTHER = "Other",
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
export enum NotificationType {
  JOB_POSTED = "job_posted",
  JOB_APPROVED = "job_approved",
  JOB_APPLIED = "job_applied",
  ADMIN_JOB_APPROVED = "admin_job_approved",
  ADMIN_JOB_REJECTED = "admin_job_rejected",
  JOB_MATCHED = "job_matched",
  PROFILE_VIEWED = "profile_viewed",
  CV_APPROVED = "cv_approved",
  CV_REJECTED = "cv_rejected",
  ORGANIZATION_INVITED = "organization_invited",
  SYSTEM = "system",
}
export enum NotificationStatusEnum {
  READ = "read",
  DELETED = "deleted",
}
export enum SchoolTypeEnum {
  COLLEGE = "college",
  UNIVERSITY = "university",
  HIGH_SCHOOL = "high_school",
  SECONDARY = "secondary",
  PRIMARY = "primary",
}
export enum OrganizationRoleEnum {
  ORGANIZATION_OWNER = "organization_owner",
  ORGANIZATION_ADMIN = "organization_admin",
  ORGANIZATION_EDITOR = "organization_editor",
  ORGANIZATION_VIEWER = "organization_viewer",
  ORGANIZATION_CONTENT_ADMIN = "organization_content_admin",
  ORGANIZATION_CONTENT_EDITOR = "organization_content_editor",
  ORGANIZATION_CONTENT_VIEWER = "organization_content_viewer",
  ORGANIZATION_RECRUITER_ADMIN = "organization_recruiter_admin",
  ORGANIZATION_RECRUITER_EDITOR = "organization_recruiter_editor",
  ORGANIZATION_RECRUITER_VIEWER = "organization_recruiter_viewer",
  ORGANIZATION_ANALYST_ADMIN = "organization_analyst_admin",
  ORGANIZATION_ANALYST_EDITOR = "organization_analyst_editor",
  ORGANIZATION_ANALYST_VIEWER = "organization_analyst_viewer",
  ORGANIZATION_EMPLOYEE = "organization_employee",
  ANONYMOUSLY = "anonymously",
}

export enum OrganizationInviteStatusEnum {
  PENDING = "pending",
  ACCEPTED = "accepted",
  DECLINED = "declined",
}

export enum OrganizationInvitationTypeEnum {
  INCOMING = "incoming",
  OUTGOING = "outgoing",
}

export enum DomainTypeEnum {
  ORGANIZATION = "org",
  ALL = "*",
}

export enum UpdateJobTypeEnum {
  UPDATE = "update",
  APPROVAL = "approval",
  REJECTED = "rejected",
}
export enum FeedbackStatusEnum {
  PENDING = "pending",
  READ = "read",
  RESOLVED = "resolved",
}
