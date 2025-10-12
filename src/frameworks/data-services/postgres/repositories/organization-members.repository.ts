import { OrganizationMember } from "@/core";
import { GenericRepository } from "./generic-repository";
import { organizationMembers } from "../models";
import { Inject, Injectable } from "@nestjs/common";
import {
  IOrganizationMembersRepository,
  MemberFilter,
} from "@/core/abstracts/repositories/organization-members.abstract";
import { type DBDrizzle } from "@/frameworks/data-services/postgres/types";
import { PaginatedResult } from "@/common/types/api";

@Injectable()
export class OrganizationMembersRepository
  extends GenericRepository<OrganizationMember, typeof organizationMembers>
  implements IOrganizationMembersRepository
{
  constructor(@Inject("DRIZZLE") protected db: DBDrizzle) {
    super(db, organizationMembers);
  }
  getMembersByOrganizationId(
    organizationId: string,
    cursor: string,
    limit: number,
    filter?: MemberFilter,
  ): Promise<PaginatedResult<OrganizationMember>> {
    throw new Error("Method not implemented.");
  }
  countMembersByOrganizationId(
    organizationId: string,
    filter?: MemberFilter,
  ): Promise<number> {
    throw new Error("Method not implemented.");
  }
}
