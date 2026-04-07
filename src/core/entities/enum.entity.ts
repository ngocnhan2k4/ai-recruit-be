export enum JobStatusEnum {
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
  JOB_UPDATED = "job_updated",
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
  FEEDBACK_ASSIGNED = "feedback_assigned",
}
export enum NotificationStatusEnum {
  READ = "read",
  DELETED = "deleted",
}

export enum NotiGroupTypeEnum {
  RECRUITMENT = "recruitment",
  PROFILE = "profile",
  ORG = "org",
  SYSTEM = "system",
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

export enum FeedbackStatusEnum {
  PENDING = "pending",
  READ = "read",
  RESOLVED = "resolved",
}

export enum SkillLevelEnum {
  BEGINNER = "beginner",
  INTERMEDIATE = "intermediate",
  ADVANCED = "advanced",
}

export enum SkillResolutionStatusEnum {
  MATCHED = "matched",
  PENDING = "pending",
}

export enum ResourceTypeEnum {
  VIDEO = "video",
  COURSE = "course",
  ARTICLE = "article",
  BOOK = "book",
  DOCUMENTATION = "documentation",
}

export enum GapDifficultyEnum {
  EASY = "easy",
  MEDIUM = "medium",
  HARD = "hard",
}

export enum CvLanguageEnum {
  ENGLISH = "en",
  VIETNAMESE = "vi",
}

export enum CvTemplateEnum {
  CLASSIC = "classic",
  MODERN_BLUE = "modern-blue",
  MODERN_GREEN = "modern-green",
}

export enum EmailJobType {
  ORGANIZATION_INVITATION = "organization_invitation",
  ORGANIZATION_VERIFICATION = "organization_verification",
  ORGANIZATION_CHANGE_EMAIL = "organization_change_email",
  JOB_RECOMMENDATIONS = "job_recommendations",
  FEEDBACK_ASSIGNED = "feedback_assigned",
  CUSTOM = "custom",
}

export enum OtpPurpose {
  VERIFY_EMAIL = "VERIFY_EMAIL",
  VERIFY_ORGANIZATION_EMAIL = "VERIFY_ORGANIZATION_EMAIL",
  CHANGE_ORGANIZATION_EMAIL = "CHANGE_ORGANIZATION_EMAIL",
}

export enum UserInteractionEnum {
  SAVE = "save",
  //[TODO] remove later
  //HIDE = "hide",
}
export enum PhaseStatusEnum {
  NOT_STARTED = "not_started",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
}
export enum FeatureCodeEnum {
  LEARNING_PATH = "learning_path",
  SUGGEST_CV_FIELD = "suggest_cv_field",
  OPTIMIZE_CV = "optimize_cv",
}
export enum BillingCycleSubscriptionEnum {
  MONTHLY = "monthly",
  YEARLY = "yearly",
}
export enum UserSubscriptionStatusEnum {
  INCOMPLETE = "incomplete",
  ACTIVE = "active",
  CANCELED = "canceled",
  // EXPIRED = "expired",
}

export enum SubscriptionEnum {
  FREE = "FREE",
  BASIC = "BASIC",
  PRO = "PRO",
  ENTERPRISE = "ENTERPRISE",
}

export enum TaskStatusEnum {
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  COMPLETED = "completed",
  FAILED = "failed",
}

export enum TaskTypeEnum {
  LEARNING_PATH_GENERATION = "learning_path_generation",
  CV_GENERATION = "cv_generation",
}
