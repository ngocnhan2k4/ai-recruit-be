import { Injectable, Logger } from "@nestjs/common";
import { IOrganizationRepository } from "@/core";

// [TODO-PHAT]: check logic organization here
@Injectable()
export class OrganizationUseCase {
  private readonly logger = new Logger(OrganizationUseCase.name);

  constructor(
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  async checkOrganizationName(_orgName: string) {}

  async createOrganization(_data: any) {}

  async updateOrganization(_orgId: string, _data: any) {}

  async deleteOrganization(_id: string) {}

  async getOrganizationById(_id: string, _userId: string) {}

  async getOrganizationsByOwner(_userId: string, _query: any) {}
}
