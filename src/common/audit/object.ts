import { Action } from "@/common/constants/action";
import { AuditVisibility, ObjectType } from "@/core";

/**
 * Activity action format: `{type}/{function}`
 * - type: source of the call (api | scheduler | worker | …)
 * - function: handler name (API → controller method; worker/scheduler → fn name)
 */
export enum ActivityActionEnum {
  // Job
  CREATE_JOB = "api/createJob",
  UPDATE_JOB = "api/updateJob",
  DELETE_JOB = "api/deleteJob",
  APPLY_JOB = "api/applyJob",
  UPDATE_JOB_APPLICATION = "api/updateApplyJob",
  SAVE_JOB = "api/saveJob",
  ADMIN_CREATE_JOB = "api/adminCreateJob",
  ADMIN_UPDATE_JOB = "api/adminUpdateJob",
  ADMIN_DELETE_JOB = "api/adminDeleteJob",

  // Organization
  CREATE_ORGANIZATION = "api/createOrganization",
  DELETE_ORGANIZATION = "api/deleteOrganization",
  UPDATE_ORGANIZATION_BASIC_INFO = "api/updateOrganizationBasicInfo",
  UPDATE_ORGANIZATION_LOCATIONS = "api/updateOrganizationLocations",
  UPDATE_ORGANIZATION_ADDITIONAL_INFO = "api/updateOrganizationAdditionalInfo",
  UPDATE_ORGANIZATION_EMAIL = "api/updateOrganizationEmail",
  CONFIRM_ORGANIZATION_EMAIL = "api/confirmUpdateOrganizationEmail",
  SEND_ORGANIZATION_EMAIL_VERIFICATION = "api/sendEmailVerificationOtp",
  VERIFY_ORGANIZATION_EMAIL = "api/verifyOrganizationEmail",
  UPDATE_ORGANIZATION_LOGO = "api/updateOrganizationLogo",
  UPDATE_ORGANIZATION_MEMBER_ROLE = "api/updateMemberRole",
  KICK_ORGANIZATION_MEMBER = "api/kickMember",
  LEAVE_ORGANIZATION = "api/deleteMember",
  SEND_ORGANIZATION_INVITATION = "api/inviteMember",
  CANCEL_ORGANIZATION_INVITATION = "api/revokeInvitation",
  UPDATE_ORGANIZATION_INVITATION_ROLE = "api/updateInivitationRole",
  ADMIN_UPDATE_ORGANIZATION = "api/updateOrganization",
  ADMIN_DELETE_ORGANIZATION = "api/adminDeleteOrganization",

  // User
  UPDATE_USER_PROFILE = "api/updateProfile",
  UPDATE_USER_AVATAR = "api/uploadUserAvatar",
  COMPLETE_USER_ONBOARDING = "api/completeUserOnboarding",
  CREATE_USER_EXPERIENCE = "api/createUserExperience",
  UPDATE_USER_EXPERIENCE = "api/updateUserExperience",
  DELETE_USER_EXPERIENCE = "api/deleteUserExperience",
  ADD_USER_SKILL = "api/createUserSkill",
  REMOVE_USER_SKILL = "api/deleteUserSkill",
  CREATE_USER_EDUCATION = "api/createUserEducation",
  UPDATE_USER_EDUCATION = "api/updateUserEducation",
  DELETE_USER_EDUCATION = "api/deleteUserEducation",
  RESPOND_USER_INVITATION = "api/respondToOrganizationInvitation",
  LINK_USER_PROVIDER = "api/linkProvider",
  UNLINK_USER_PROVIDER = "api/unlinkProvider",
  DELETE_USER_ACCOUNT = "api/deleteUserAccount",
  RESTORE_USER_ACCOUNT = "api/restoreUserAccount",
  ADMIN_UPDATE_USER = "api/adminUpdateUser",
  ADMIN_DELETE_USER = "api/deleteUser",
}

/** Map audit action string → message Action verb. */
export function activityActionToAction(action: string): Action {
  switch (action as ActivityActionEnum) {
    // Create / Insert
    case ActivityActionEnum.CREATE_JOB:
    case ActivityActionEnum.ADMIN_CREATE_JOB:
    case ActivityActionEnum.CREATE_ORGANIZATION:
    case ActivityActionEnum.CREATE_USER_EXPERIENCE:
    case ActivityActionEnum.CREATE_USER_EDUCATION:
    case ActivityActionEnum.ADD_USER_SKILL:
      return Action.ActionInsert;

    // Apply / Save
    case ActivityActionEnum.APPLY_JOB:
      return Action.ActionApply;
    case ActivityActionEnum.SAVE_JOB:
      return Action.ActionSave;

    // Delete
    case ActivityActionEnum.DELETE_JOB:
    case ActivityActionEnum.ADMIN_DELETE_JOB:
    case ActivityActionEnum.DELETE_ORGANIZATION:
    case ActivityActionEnum.ADMIN_DELETE_ORGANIZATION:
    case ActivityActionEnum.DELETE_USER_EXPERIENCE:
    case ActivityActionEnum.REMOVE_USER_SKILL:
    case ActivityActionEnum.DELETE_USER_EDUCATION:
    case ActivityActionEnum.DELETE_USER_ACCOUNT:
    case ActivityActionEnum.ADMIN_DELETE_USER:
      return Action.ActionDelete;

    // Kick / Leave
    case ActivityActionEnum.KICK_ORGANIZATION_MEMBER:
      return Action.ActionKick;
    case ActivityActionEnum.LEAVE_ORGANIZATION:
      return Action.ActionLeave;

    // Invite / Cancel
    case ActivityActionEnum.SEND_ORGANIZATION_INVITATION:
      return Action.ActionInvite;
    case ActivityActionEnum.CANCEL_ORGANIZATION_INVITATION:
      return Action.ActionCancel;

    // Verify / Confirm / Send
    case ActivityActionEnum.VERIFY_ORGANIZATION_EMAIL:
      return Action.ActionVerify;
    case ActivityActionEnum.CONFIRM_ORGANIZATION_EMAIL:
      return Action.ActionConfirm;
    case ActivityActionEnum.SEND_ORGANIZATION_EMAIL_VERIFICATION:
      return Action.ActionSend;

    // Link / Unlink / Restore / Complete
    case ActivityActionEnum.LINK_USER_PROVIDER:
      return Action.ActionLink;
    case ActivityActionEnum.UNLINK_USER_PROVIDER:
      return Action.ActionUnlink;
    case ActivityActionEnum.RESTORE_USER_ACCOUNT:
      return Action.ActionRestore;
    case ActivityActionEnum.COMPLETE_USER_ONBOARDING:
      return Action.ActionComplete;

    // Update (default for remaining known update actions)
    case ActivityActionEnum.UPDATE_JOB:
    case ActivityActionEnum.UPDATE_JOB_APPLICATION:
    case ActivityActionEnum.ADMIN_UPDATE_JOB:
    case ActivityActionEnum.UPDATE_ORGANIZATION_BASIC_INFO:
    case ActivityActionEnum.UPDATE_ORGANIZATION_LOCATIONS:
    case ActivityActionEnum.UPDATE_ORGANIZATION_ADDITIONAL_INFO:
    case ActivityActionEnum.UPDATE_ORGANIZATION_EMAIL:
    case ActivityActionEnum.UPDATE_ORGANIZATION_LOGO:
    case ActivityActionEnum.UPDATE_ORGANIZATION_MEMBER_ROLE:
    case ActivityActionEnum.UPDATE_ORGANIZATION_INVITATION_ROLE:
    case ActivityActionEnum.ADMIN_UPDATE_ORGANIZATION:
    case ActivityActionEnum.UPDATE_USER_PROFILE:
    case ActivityActionEnum.UPDATE_USER_AVATAR:
    case ActivityActionEnum.UPDATE_USER_EXPERIENCE:
    case ActivityActionEnum.UPDATE_USER_EDUCATION:
    case ActivityActionEnum.RESPOND_USER_INVITATION:
    case ActivityActionEnum.ADMIN_UPDATE_USER:
      return Action.ActionUpdate;

    default:
      return Action.ActionUpdate;
  }
}

type RouteDef = {
  targetType: ObjectType;
  visibility: AuditVisibility;
  action: ActivityActionEnum;
};

export const AUDIT_ROUTES: Record<string, RouteDef> = {
  // —— Jobs (user / org) ——
  "PUT_/organizations/:orgId/jobs/:jobId": {
    targetType: ObjectType.JOB,
    visibility: "org",
    action: ActivityActionEnum.UPDATE_JOB,
  },
  "DELETE_/organizations/:orgId/jobs/:jobId": {
    targetType: ObjectType.JOB,
    visibility: "org",
    action: ActivityActionEnum.DELETE_JOB,
  },
  "POST_/organizations/:orgId/jobs": {
    targetType: ObjectType.JOB,
    visibility: "org",
    action: ActivityActionEnum.CREATE_JOB,
  },
  "PUT_/jobs/apply/:applyId": {
    targetType: ObjectType.JOB,
    visibility: "actor",
    action: ActivityActionEnum.UPDATE_JOB_APPLICATION,
  },
  "POST_/jobs/apply": {
    targetType: ObjectType.JOB,
    visibility: "actor",
    action: ActivityActionEnum.APPLY_JOB,
  },
  "POST_/jobs/save": {
    targetType: ObjectType.JOB,
    visibility: "actor",
    action: ActivityActionEnum.SAVE_JOB,
  },
  "PUT_/admin/jobs/:id": {
    targetType: ObjectType.JOB,
    visibility: "admin_only",
    action: ActivityActionEnum.ADMIN_UPDATE_JOB,
  },
  "DELETE_/admin/jobs/:id": {
    targetType: ObjectType.JOB,
    visibility: "admin_only",
    action: ActivityActionEnum.ADMIN_DELETE_JOB,
  },
  "POST_/admin/jobs": {
    targetType: ObjectType.JOB,
    visibility: "admin_only",
    action: ActivityActionEnum.ADMIN_CREATE_JOB,
  },

  // —— Organization members / invitations ——
  "PATCH_/organizations/:orgId/members/:userId/role": {
    targetType: ObjectType.ORG,
    visibility: "org",
    action: ActivityActionEnum.UPDATE_ORGANIZATION_MEMBER_ROLE,
  },
  "POST_/organizations/:orgId/members/kick-member": {
    targetType: ObjectType.ORG,
    visibility: "org",
    action: ActivityActionEnum.KICK_ORGANIZATION_MEMBER,
  },
  "POST_/organizations/:orgId/members/delete": {
    targetType: ObjectType.ORG,
    visibility: "org",
    action: ActivityActionEnum.LEAVE_ORGANIZATION,
  },
  "PATCH_/organizations/:orgId/invitations/:invitationId/role": {
    targetType: ObjectType.ORG,
    visibility: "org",
    action: ActivityActionEnum.UPDATE_ORGANIZATION_INVITATION_ROLE,
  },
  "DELETE_/organizations/:orgId/invitations/:invitationId": {
    targetType: ObjectType.ORG,
    visibility: "org",
    action: ActivityActionEnum.CANCEL_ORGANIZATION_INVITATION,
  },
  "POST_/organizations/:orgId/invitations": {
    targetType: ObjectType.ORG,
    visibility: "org",
    action: ActivityActionEnum.SEND_ORGANIZATION_INVITATION,
  },

  // —— Organization ——
  "PATCH_/organizations/:orgId/basic-info": {
    targetType: ObjectType.ORG,
    visibility: "org",
    action: ActivityActionEnum.UPDATE_ORGANIZATION_BASIC_INFO,
  },
  "PATCH_/organizations/:orgId/locations": {
    targetType: ObjectType.ORG,
    visibility: "org",
    action: ActivityActionEnum.UPDATE_ORGANIZATION_LOCATIONS,
  },
  "PATCH_/organizations/:orgId/additional-info": {
    targetType: ObjectType.ORG,
    visibility: "org",
    action: ActivityActionEnum.UPDATE_ORGANIZATION_ADDITIONAL_INFO,
  },
  "POST_/organizations/:orgId/email/confirm": {
    targetType: ObjectType.ORG,
    visibility: "org",
    action: ActivityActionEnum.CONFIRM_ORGANIZATION_EMAIL,
  },
  "POST_/organizations/:orgId/email/send-verification": {
    targetType: ObjectType.ORG,
    visibility: "org",
    action: ActivityActionEnum.SEND_ORGANIZATION_EMAIL_VERIFICATION,
  },
  "POST_/organizations/:orgId/email/verify": {
    targetType: ObjectType.ORG,
    visibility: "org",
    action: ActivityActionEnum.VERIFY_ORGANIZATION_EMAIL,
  },
  "PATCH_/organizations/:orgId/email": {
    targetType: ObjectType.ORG,
    visibility: "org",
    action: ActivityActionEnum.UPDATE_ORGANIZATION_EMAIL,
  },
  "PATCH_/organizations/:orgId/logo": {
    targetType: ObjectType.ORG,
    visibility: "org",
    action: ActivityActionEnum.UPDATE_ORGANIZATION_LOGO,
  },
  "DELETE_/organizations/:orgId": {
    targetType: ObjectType.ORG,
    visibility: "org",
    action: ActivityActionEnum.DELETE_ORGANIZATION,
  },
  "POST_/organizations": {
    targetType: ObjectType.ORG,
    visibility: "org",
    action: ActivityActionEnum.CREATE_ORGANIZATION,
  },
  "PATCH_/admin/organizations/:orgId": {
    targetType: ObjectType.ORG,
    visibility: "admin_only",
    action: ActivityActionEnum.ADMIN_UPDATE_ORGANIZATION,
  },
  "DELETE_/admin/organizations/:orgId": {
    targetType: ObjectType.ORG,
    visibility: "admin_only",
    action: ActivityActionEnum.ADMIN_DELETE_ORGANIZATION,
  },

  // —— User ——
  "PUT_/users/profile": {
    targetType: ObjectType.USER,
    visibility: "actor",
    action: ActivityActionEnum.UPDATE_USER_PROFILE,
  },
  "POST_/users/avatar": {
    targetType: ObjectType.USER,
    visibility: "actor",
    action: ActivityActionEnum.UPDATE_USER_AVATAR,
  },
  "POST_/users/onboarding": {
    targetType: ObjectType.USER,
    visibility: "actor",
    action: ActivityActionEnum.COMPLETE_USER_ONBOARDING,
  },
  "PUT_/users/user-experiences/:id": {
    targetType: ObjectType.USER,
    visibility: "actor",
    action: ActivityActionEnum.UPDATE_USER_EXPERIENCE,
  },
  "DELETE_/users/user-experiences/:id": {
    targetType: ObjectType.USER,
    visibility: "actor",
    action: ActivityActionEnum.DELETE_USER_EXPERIENCE,
  },
  "POST_/users/user-experiences": {
    targetType: ObjectType.USER,
    visibility: "actor",
    action: ActivityActionEnum.CREATE_USER_EXPERIENCE,
  },
  "DELETE_/users/user-skills/:id": {
    targetType: ObjectType.USER,
    visibility: "actor",
    action: ActivityActionEnum.REMOVE_USER_SKILL,
  },
  "POST_/users/user-skills": {
    targetType: ObjectType.USER,
    visibility: "actor",
    action: ActivityActionEnum.ADD_USER_SKILL,
  },
  "PUT_/users/me/education/:educationId": {
    targetType: ObjectType.USER,
    visibility: "actor",
    action: ActivityActionEnum.UPDATE_USER_EDUCATION,
  },
  "DELETE_/users/me/education/:educationId": {
    targetType: ObjectType.USER,
    visibility: "actor",
    action: ActivityActionEnum.DELETE_USER_EDUCATION,
  },
  "POST_/users/me/education": {
    targetType: ObjectType.USER,
    visibility: "actor",
    action: ActivityActionEnum.CREATE_USER_EDUCATION,
  },
  "PATCH_/users/me/invitations/:invitationId": {
    targetType: ObjectType.USER,
    visibility: "actor",
    action: ActivityActionEnum.RESPOND_USER_INVITATION,
  },
  "POST_/users/me/providers/link": {
    targetType: ObjectType.USER,
    visibility: "actor",
    action: ActivityActionEnum.LINK_USER_PROVIDER,
  },
  "DELETE_/users/me/providers/:provider": {
    targetType: ObjectType.USER,
    visibility: "actor",
    action: ActivityActionEnum.UNLINK_USER_PROVIDER,
  },
  "PATCH_/users/me/restore": {
    targetType: ObjectType.USER,
    visibility: "actor",
    action: ActivityActionEnum.RESTORE_USER_ACCOUNT,
  },
  "DELETE_/users/me": {
    targetType: ObjectType.USER,
    visibility: "actor",
    action: ActivityActionEnum.DELETE_USER_ACCOUNT,
  },
  "PATCH_/admin/users/:userId": {
    targetType: ObjectType.USER,
    visibility: "admin_only",
    action: ActivityActionEnum.ADMIN_UPDATE_USER,
  },
  "DELETE_/admin/users/:userId": {
    targetType: ObjectType.USER,
    visibility: "admin_only",
    action: ActivityActionEnum.ADMIN_DELETE_USER,
  },
};

export type AuditRouteMatch = RouteDef & {
  routeKey: string;
  pattern: string;
  method: string;
};

function patternToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/:[^/]+/g, "[^/]+").replace(/\//g, "\\/");
  return new RegExp(`^${escaped}/?$`);
}

function parseRouteKey(routeKey: string): { method: string; pattern: string } {
  const sep = routeKey.indexOf("_");
  if (sep <= 0) {
    return { method: "", pattern: routeKey };
  }
  return {
    method: routeKey.slice(0, sep).toUpperCase(),
    pattern: routeKey.slice(sep + 1),
  };
}

export function matchAuditRoute(
  pathnameWithoutPrefix: string,
  method: string,
): AuditRouteMatch | null {
  const upper = method.toUpperCase();

  for (const [routeKey, route] of Object.entries(AUDIT_ROUTES)) {
    const parsed = parseRouteKey(routeKey);
    if (parsed.method !== upper) {
      continue;
    }
    if (!patternToRegex(parsed.pattern).test(pathnameWithoutPrefix)) {
      continue;
    }

    return {
      ...route,
      routeKey,
      pattern: parsed.pattern,
      method: parsed.method,
    };
  }

  return null;
}
