import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  ApiResponse,
  CreateOrganizationDto,
  PaginatedResultDto,
} from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import {
  IOrganizationRepository,
  NewOrganization,
  Organization,
  OrganizationWithDetails,
} from "@/core";
import { OrganizationTypeEnum } from "@/core";
import { GetOrganizationQueryDto } from "@/interfaces/dtos/organization/organization-query.dto";

@Injectable()
export class OrganizationUseCase {
  private readonly logger = new Logger(OrganizationUseCase.name);

  constructor(
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  /**
   * Get organization with attached sub-table data (company/school/nonprofit) using JOIN
   * This method demonstrates how to use the JOIN-based query instead of multiple queries
   */
  async getOrganizationWithDetails(
    organizationId: string,
  ): Promise<ApiResponse<OrganizationWithDetails>> {
    this.logger.log(
      `Fetching organization with details for ID: ${organizationId}`,
    );

    const organization =
      await this.organizationRepository.getOrganizationWithDetails(
        organizationId,
      );

    if (!organization) {
      throw new NotFoundException(RESPONSE_MESSAGE.ORGANIZATION_NOT_FOUND);
    }

    this.logger.log(
      `Successfully fetched organization: ${organization.name} (${organization.type})`,
    );

    return {
      message: "Organization fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: organization,
    };
  }

  async getOrganizationsByUserId(
    userId: string,
  ): Promise<ApiResponse<PaginatedResultDto<Organization>>> {
    const result =
      await this.organizationRepository.getOrganizationsByUserId(userId);

    return {
      message: "Organizations fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    };
  }

  async getOrganizations(
    query: GetOrganizationQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<Organization>>> {
    const result = await this.organizationRepository.getOrganizations({
      ...query,
      verified: query.verified,
      provinceIds: query.provinceIds,
      type: query.type,
    });

    return {
      message: "Organizations fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    };
  }

  async createOrganization(
    userId: string,
    organizationData: CreateOrganizationDto,
  ): Promise<ApiResponse<Organization>> {
    const newOrganization =
      await this.organizationRepository.createOrganization(
        userId,
        organizationData,
      );

    // Add user to organization members logic can be added here

    return {
      message: "Organization created successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: newOrganization,
    };
  }

  /**
   * Example method showing how the JOIN query works for different organization types
   */
  async demonstrateJoinQuery(organizationId: string): Promise<void> {
    const organization =
      await this.organizationRepository.getOrganizationWithDetails(
        organizationId,
      );

    if (!organization) {
      this.logger.warn(`Organization not found: ${organizationId}`);
      return;
    }

    this.logger.log(`Organization: ${organization.name}`);
    this.logger.log(`Type: ${organization.type}`);

    // The JOIN query automatically attaches the appropriate sub-table data based on type
    switch (organization.type) {
      case OrganizationTypeEnum.COMPANY:
        if (organization.companySize) {
          this.logger.log(`Company Size: ${organization.companySize}`);
          this.logger.log(`Tax Code: ${organization.taxCode}`);
          this.logger.log(`Benefits: ${organization.benefits || ""}`);
        }
        break;
    }
  }
}
