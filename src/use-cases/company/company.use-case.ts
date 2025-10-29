import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ApiResponse, CompanyDto } from "@/interfaces/dtos";

import { IBloomFilterService, ICompanyRepository } from "@/core";
import { RESPONSE_CODE } from "@/common/constants/response";
import { OrganizationWithDetails } from "@/core/entities";
@Injectable()
export class CompanyUseCase {
  private readonly logger = new Logger(CompanyUseCase.name);

  constructor(
    private readonly companyRepository: ICompanyRepository,
    public readonly bloomFilterService: IBloomFilterService,
  ) {}

  async getCompanyById(
    organizationId: string,
  ): Promise<ApiResponse<CompanyDto>> {
    if (!organizationId) {
      throw new NotFoundException(
        "[CompanyUseCase] - [getCompany] Organization ID is required",
      );
    }
    const organization =
      await this.companyRepository.getCompanyByOrganizationId(organizationId);

    if (!organization) {
      throw new NotFoundException(
        "[CompanyUseCase] - [getCompany] Organization not found",
      );
    }

    return {
      data: this.mapToCompanyDto(organization),
      message: "Company fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  private mapToCompanyDto(organization: OrganizationWithDetails): CompanyDto {
    return {
      id: organization.id,
      organizationId: organization.id,
      companySize: organization.companySize || 0,
      taxCode: organization.taxCode || "",
      benefits: organization.benefits || "",
      name: organization.name,
      slug: organization.slug,
      type: organization.type,
      description: organization.description || "",
      address: organization.address || [],
      logoUrl: organization.logoUrl || "",
      about: organization.about || "",
      websiteUrl: organization.websiteUrl || "",
      email: organization.email || "",
      phone: organization.phone || "",
      foundedYear: organization.foundedYear || 0,
      culture: organization.culture || "",
      employeesMin: organization.employeesMin || 0,
      employeesMax: organization.employeesMax || 0,
      createdAt: new Date(organization.createdAt),
      updatedAt: organization.updatedAt
        ? new Date(organization.updatedAt)
        : new Date(),
      deletedAt: organization.deletedAt
        ? new Date(organization.deletedAt)
        : new Date(),
      verifiedAt: organization.verifiedAt
        ? organization.verifiedAt.toISOString()
        : "",
    };
  }
}
