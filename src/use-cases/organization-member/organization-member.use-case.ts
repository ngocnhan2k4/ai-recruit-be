import { IOrganizationMembersRepository } from "@/core/abstracts/repositories/organization-members-repository.abstract";
import { Injectable, Logger } from "@nestjs/common";

@Injectable()
export class OrganizationMemberUseCase {
  private readonly logger: Logger = new Logger(OrganizationMemberUseCase.name);

  constructor(
    private readonly organizationMemberRepository: IOrganizationMembersRepository,
  ) {}

  async createMember(_orgId: string, _userId: string, _role: string) {}

  deleteMember(orgId: string, _userId: string) {
    this.logger.log(`Removing member from organization: ${orgId}`);
  }
}
