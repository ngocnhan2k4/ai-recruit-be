import { OrganizationMember } from "@/core";
import { GenericRepository } from "./generic-repository";
import { organizationMembers } from "../models";
import { Injectable } from "@nestjs/common";

@Injectable()
export class OrganizationMembersRepository extends GenericRepository<
  OrganizationMember,
  typeof organizationMembers
> {}
