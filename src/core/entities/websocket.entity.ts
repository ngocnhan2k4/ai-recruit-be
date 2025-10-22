import { Company, User } from ".";

export interface IdentityUser {
  userId: User["id"];
  organizationId?: Company["id"];
}
