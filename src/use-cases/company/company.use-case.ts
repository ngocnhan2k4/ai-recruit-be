import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { ApiResponse, CompanyDto } from "@/interfaces/dtos";

import { Company, ICompanyRepository } from "@/core";
import { CompanyFilters } from "@/core/entities/company.entity";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { PaginatedResult } from "@/common/types/api";
@Injectable()
export class CompanyUseCase implements OnModuleInit {
  private readonly logger = new Logger(CompanyUseCase.name);

  constructor(private readonly companyRepository: ICompanyRepository) {}

  onModuleInit(): void {}

  async getCompanies(
    limit = 20,
    filter?: CompanyFilters,
    cursor?: string,
  ): Promise<
    ApiResponse<
      PaginatedResult<Pick<Company, "id" | "name" | "logoUrl" | "address">>
    >
  > {
    const result = await this.companyRepository.getCompanies(
      limit,
      filter,
      cursor,
    );
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    };
  }

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

  private mapToCompanyDto(organization: Company): CompanyDto {
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
      updatedAt: organization.updatedAt,
      deletedAt: organization.deletedAt,
      verifiedAt: organization.verifiedAt,
    };
  }
}
