import { Organization, User } from ".";

export interface IdentityUser {
  userId: User["id"];
  organizationId?: Organization["id"];
}
