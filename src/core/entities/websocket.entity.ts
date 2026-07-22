import { OrganizationWithDetails, User } from ".";

export interface IdentityUser {
  userId: User["id"];
  organizationId?: OrganizationWithDetails["id"];
  languageCode?: string;
  preferredLanguage?: string;
}
