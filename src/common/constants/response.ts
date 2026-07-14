/** Firebase Admin integration context */
export const FIREBASE_ADMIN = "FIREBASE_ADMIN";

/** Casbin permission cache key */

export const DEFAULT_SAVE_JOB_LIMIT = 10; // FREE tier fallback
export const PERM_KEY = "CASBIN_PERM";

export const RESPONSE_CODE = {
  // --- HTTP / generic ---
  SUCCESS: "SUCCESS",
  CREATED: "CREATED",
  BAD_REQUEST: "BAD_REQUEST",
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_REQUEST: "INVALID_REQUEST",
  SERVER_ERROR: "SERVER_ERROR",
  FORBIDDEN: "FORBIDDEN",
  UNAUTHORIZED: "UNAUTHORIZED",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",

  // --- Auth / session ---
  INVALID_CREDENTIALS: "INVALID_CREDENTIALS",
  TOKEN_EXPIRED: "TOKEN_EXPIRED",
  TOKEN_NOT_FOUND: "TOKEN_NOT_FOUND",
  ACCOUNT_PENDING_DELETION: "ACCOUNT_PENDING_DELETION",

  // --- User / profile ---
  USER_NOT_FOUND: "USER_NOT_FOUND",
  USER_NOT_UPDATED: "USER_NOT_UPDATED",
  USERNAME_ALREADY_EXISTS: "USERNAME_ALREADY_EXISTS",
  PHONE_ALREADY_EXISTS: "PHONE_ALREADY_EXISTS",
  EMAIL_ALREADY_EXISTS: "EMAIL_ALREADY_EXISTS",
  USER_EXPERIENCE_NOT_FOUND: "USER_EXPERIENCE_NOT_FOUND",
  USER_SKILL_NOT_FOUND: "USER_SKILL_NOT_FOUND",
  USER_EDUCATION_NOT_FOUND: "USER_EDUCATION_NOT_FOUND",
  PROFILE_TOO_SHORT: "PROFILE_TOO_SHORT",

  // --- CV & file upload ---
  FILE_NOT_FOUND: "FILE_NOT_FOUND",
  CV_FILE_REQUIRED: "CV_FILE_REQUIRED",
  CV_FILE_INVALID: "CV_FILE_INVALID",
  ERROR_UPLOADING_FILE: "ERROR_UPLOADING_FILE",
  FILE_NOT_PROVIDE: "FILE_NOT_PROVIDE",
  FILE_TYPE_NOT_SUPPORTED: "FILE_TYPE_NOT_SUPPORTED",
  CV_NOT_FOUND: "CV_NOT_FOUND",
  CV_NOT_UPDATED: "CV_NOT_UPDATED",
  CV_NOT_DELETED: "CV_NOT_DELETED",
  CV_OPTIMIZATION_FAILED: "CV_OPTIMIZATION_FAILED",
  CV_TOO_SHORT: "CV_TOO_SHORT",

  // --- Job & application ---
  JOB_NOT_FOUND: "JOB_NOT_FOUND",
  JOB_NOT_ACTIVE: "JOB_NOT_ACTIVE",
  JOB_NOT_UPDATED: "JOB_NOT_UPDATED",
  JOB_NOT_DELETED: "JOB_NOT_DELETED",
  APPLICATION_NOT_UPDATED: "APPLICATION_NOT_UPDATED",
  APPLICATION_NOT_FOUND: "APPLICATION_NOT_FOUND",
  ALREADY_APPLIED: "ALREADY_APPLIED",
  CV_REQUIRED_FOR_JOB: "CV_REQUIRED_FOR_JOB",

  // --- Organization ---
  ORGANIZATION_NOT_FOUND: "ORGANIZATION_NOT_FOUND",
  ORGANIZATION_ID_REQUIRED: "ORGANIZATION_ID_REQUIRED",
  CREATE_ORGANIZATION_FAILED: "CREATE_ORGANIZATION_FAILED",
  UPDATE_ORGANIZATION_FAILED: "UPDATE_ORGANIZATION_FAILED",
  ORGANIZATION_EMAIL_ALREADY_VERIFIED: "ORGANIZATION_EMAIL_ALREADY_VERIFIED",
  ORGANIZATION_NAME_CONFIRMATION_NOT_MATCH:
    "ORGANIZATION_NAME_CONFIRMATION_NOT_MATCH",

  // --- RBAC / Casbin ---
  POLICY_ALREADY_EXISTS: "POLICY_ALREADY_EXISTS",
  POLICY_NOT_FOUND: "POLICY_NOT_FOUND",
  ROLE_NOT_ASSIGNED: "ROLE_NOT_ASSIGNED",
  ROLE_NOT_REMOVED: "ROLE_NOT_REMOVED",
  DOMAIN_ROLE_NOT_ASSIGNED: "DOMAIN_ROLE_NOT_ASSIGNED",
  DOMAIN_ROLE_NOT_REMOVED: "DOMAIN_ROLE_NOT_REMOVED",

  // --- Invitations & org members ---
  INVITEE_ALREADY_MEMBER: "INVITEE_ALREADY_MEMBER",
  INVITATION_ALREADY_SENT: "INVITATION_ALREADY_SENT",
  INVITATION_NOT_PENDING: "INVITATION_NOT_PENDING",
  SENT_INVITATION_FAILED: "SENT_INVITATION_FAILED",
  INVITATION_NOT_FOUND: "INVITATION_NOT_FOUND",
  UPDATE_INVITATION_FAILED: "UPDATE_INVITATION_FAILED",
  ADD_MEMBER_FAILED: "ADD_MEMBER_FAILED",
  MEMBER_NOT_FOUND: "MEMBER_NOT_FOUND",

  // --- Notifications ---
  INVALID_NOTIFICATION_STATUS: "INVALID_NOTIFICATION_STATUS",

  // --- Feedback ---
  FEEDBACK_NOT_FOUND: "FEEDBACK_NOT_FOUND",
  FEEDBACK_ALREADY_RESOLVED: "FEEDBACK_ALREADY_RESOLVED",

  // --- OTP / email verification ---
  OTP_NOT_VALID: "OTP_NOT_VALID",
  EMAIL_NOT_MATCH: "EMAIL_NOT_MATCH",

  // --- Skills & learning path ---
  SKILL_NOT_FOUND: "SKILL_NOT_FOUND",
  ROADMAP_NOT_FOUND: "ROADMAP_NOT_FOUND",
  SKILL_NOT_FOUND_IN_ROADMAP: "SKILL_NOT_FOUND_IN_ROADMAP",

  // --- AI-generated CV ---
  AI_CV_NOT_FOUND: "AI_CV_NOT_FOUND",
  AI_CV_NOT_UPDATED: "AI_CV_NOT_UPDATED",
  AI_CV_NOT_DELETED: "AI_CV_NOT_DELETED",

  // --- Subscription & feature gating ---
  FEATURE_NOT_FOUND: "FEATURE_NOT_FOUND",
  SUBSCRIPTION_NOT_FOUND: "SUBSCRIPTION_NOT_FOUND",
  FEATURE_OR_SUBSCRIPTION_NOT_AVAILABLE:
    "FEATURE_OR_SUBSCRIPTION_NOT_AVAILABLE",
  NO_SUBSCRIPTION: "NO_SUBSCRIPTION",
  FEATURE_NOT_AVAILABLE: "FEATURE_NOT_AVAILABLE",
  SUBSCRIPTION_EXPIRED: "SUBSCRIPTION_EXPIRED",
  FEATURE_NOT_INCLUDED_IN_SUBSCRIPTION: "FEATURE_NOT_INCLUDED_IN_SUBSCRIPTION",
  MAX_SAVED_JOBS_LIMIT: "MAX_SAVED_JOBS_LIMIT",

  // --- Blog ---
  BLOG_POST_NOT_FOUND: "BLOG_POST_NOT_FOUND",
  BLOG_IS_NOT_DRAFT: "BLOG_IS_NOT_DRAFT",
  BLOG_POST_IS_DRAFT: "BLOG_POST_IS_DRAFT",
  BLOG_POST_NOT_PUBLISHED: "BLOG_POST_NOT_PUBLISHED",

  // --- Task ---
  TASK_NOT_FOUND: "TASK_NOT_FOUND",
} as const;

export const RESPONSE_MESSAGE = {
  // --- HTTP / generic ---
  SUCCESS: "Request was successful.",
  CREATED: "Resource was created successfully.",
  SERVER_ERROR: "Internal server error.",
  FORBIDDEN: "Access denied.",
  UNAUTHORIZED: "Unauthorized access.",
  VALIDATION_ERROR: "Validation error.",
  TOO_MANY_REQUESTS: "Too many requests. Please slow down.",

  // --- Auth ---
  INVALID_CREDENTIALS: "Invalid credentials.",
  ACCOUNT_PENDING_DELETION:
    "Account pending deletion. You can restore or continue waiting.",

  // --- User / profile ---
  USER_NOT_FOUND: "User not found.",
  USER_NOT_UPDATED: "User not updated.",
  USER_EXPERIENCE_NOT_FOUND: "User experience not found.",
  USER_SKILL_NOT_FOUND: "User skill not found.",
  USERNAME_ALREADY_EXISTS: "Username already exists.",
  PHONE_ALREADY_EXISTS: "Phone number already exists.",
  EMAIL_ALREADY_EXISTS: "Email already exists.",

  // --- CV & files ---
  CV_NOT_FOUND: "CV not found.",
  ERROR_UPLOADING_FILE: "Error uploading file.",
  CV_FILE_REQUIRED: "CV file is required",
  INVALID_FILE_TYPE:
    "Invalid file type. Only PDF and DOCX files are supported.",
  FILE_TOO_LARGE: "File size exceeds 5MB limit.",

  // --- Job ---
  JOB_NOT_FOUND: "Job not found.",
  JOB_NOT_ACTIVE: "Only active jobs can be applied.",
  CV_REQUIRED_FOR_JOB: "A CV is required to apply for this job.",
  ALREADY_APPLIED: "You have already applied for this job.",

  // --- Organization ---
  ORGANIZATION_NOT_FOUND: "Organization not found.",
  ORGANIZATION_ID_REQUIRED: "organizationId is required for this action.",
  CREATE_ORGANIZATION_FAILED: "Failed to create organization.",
  UPDATE_ORGANIZATION_FAILED: "Failed to update organization.",
  ADDITIONAL_INFO_ONLY_FOR_COMPANIES:
    "Additional info (culture, benefits) is only available for companies",

  // --- Invitations & members ---
  INVITEE_ALREADY_MEMBER: "The user is already a member of the organization.",
  INVITATION_ALREADY_SENT: "An invitation has already been sent to this user.",
  SENT_INVITATION_FAILED: "Failed to send invitation.",
  INVITATION_NOT_FOUND: "Invitation not found.",
  INVITATION_NOT_PENDING: "Invitation is not pending.",
  UPDATE_INVITATION_FAILED: "Failed to update invitation.",
  ADD_MEMBER_FAILED: "Failed to add member to the organization.",
  MEMBER_NOT_FOUND:
    "The member to be kicked does not exist in the organization.",

  // --- Notifications ---
  INVALID_NOTIFICATION_STATUS:
    "Notification status can only be 'read' or 'deleted'.",

  // --- OTP / email verification ---
  OTP_NOT_VALID: "The provided OTP is invalid or has expired.",
  EMAIL_NOT_MATCH:
    "The provided email does not match the organization's email.",
  ORGANIZATION_EMAIL_ALREADY_VERIFIED:
    "The organization's email is already verified.",
  ORGANIZATION_NAME_CONFIRMATION_NOT_MATCH:
    "Organization name confirmation does not match. Please enter the exact organization name to confirm deletion.",

  // --- AI CV ---
  AI_CV_NOT_FOUND: "CV generated from the CV is not found.",
  AI_CV_NOT_UPDATED: "Failed to update AI CV",
  AI_CV_NOT_DELETED: "Failed to delete AI CV from database",

  // --- BLOG ---
  BLOG_POST_NOT_FOUND: "Blog post not found.",
  BLOG_IS_NOT_DRAFT: "Only draft blog posts can be submitted via create API.",
  BLOG_POST_IS_DRAFT:
    "Blog post is a draft and cannot be viewed or modified in this context.",
  BLOG_POST_NOT_PUBLISHED: "Blog post is not published yet.",

  // --- Task ---
  TASK_NOT_FOUND: "Task not found.",
} as const;
