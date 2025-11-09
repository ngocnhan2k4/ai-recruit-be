import { OrganizationMemberInvitation } from "@/core";
import { GenericRepository } from "./generic-repository";
import { organizationMemberInvitations } from "../models";
import { Inject, Injectable } from "@nestjs/common";
import { type DBDrizzle } from "@/frameworks/data-services/postgres/types";
import { IOrganizationMemberInvitationRepository } from "@/core/abstracts/repositories/organization-member-invitations-repository.abstract";

@Injectable()
export class OrganizationMemberInvitationsRepository
  extends GenericRepository<
    OrganizationMemberInvitation,
    typeof organizationMemberInvitations
  >
  implements IOrganizationMemberInvitationRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, organizationMemberInvitations);
  }
}
