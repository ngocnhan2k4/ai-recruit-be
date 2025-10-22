import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  ApiResponse,
  CompanyWithOrganizationResponseDto,
  GetCompanyDto,
  UpdateCompanyWithOrganizationDto,
} from "@/interfaces/dtos";
import { CreateCompanyDto } from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { Company, ICompanyRepository, OrganizationWithDetails } from "@/core";
import { PaginatedResult } from "@/common/types/api";
import { OrganizationRole } from "@/common/constants/organization-roles";
import { IOrganizationMembersRepository } from "@/core/abstracts/repositories/organization-members.abstract";
import { IOrganizationRepository } from "@/core/abstracts/repositories/organization.abstract";

@Injectable()
export class CompanyUseCase {
  constructor(
    private readonly companyRepository: ICompanyRepository,
    private readonly organizationMembersRepository: IOrganizationMembersRepository,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  private readonly logger = new Logger(CompanyUseCase.name);

  // async getAllCompanies(): Promise<
  //   ApiResponse<Pick<Company, "organizationId" | "companySize" | "taxCode" | "benefits" | "companyRawId">[]>
  // > {
  //   const result = await this.companyRepository.getAllCompanies();

  //   return {
  //     message: "Companies retrieved successfully",
  //     code: RESPONSE_CODE.SUCCESS,
  //     data: result,
  //   };
  // }

  async getCompanies(
    limit = 20,
    keyword?: string,
    cursor?: string,
  ): Promise<
    ApiResponse<
      PaginatedResult<
        Pick<OrganizationWithDetails, "id" | "name" | "logoUrl" | "address">
      >
    >
  > {
    const result = await this.companyRepository.getCompanies(
      limit,
      keyword,
      cursor,
    );
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    };
  }

  async createCompany(
    userId: string,
    data: CreateCompanyDto,
  ): Promise<ApiResponse<Company>> {
    const organization = await this.companyRepository.create({
      ...data,
    });
    if (!organization) {
      throw new BadRequestException(
        "[CompanyUseCase] - [createCompany] Create company failed",
      );
    }
    const organizationMember = await this.organizationMembersRepository.create({
      userId: userId,
      organizationId: organization.organizationId,
      role: OrganizationRole.ORGANIZATION_OWNER,
    });
    if (!organizationMember) {
      await this.companyRepository.delete({
        organizationId: organization.organizationId,
      });
      throw new BadRequestException(
        "[CompanyUseCase] - [createCompany] Create organization member failed",
      );
    }
    return {
      message: "Company created successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: organization,
    };
  }

  // async getCompaniesByUserId(
  //   userId: string,
  //   limit: number,
  //   cursor: string,
  // ): Promise<ApiResponse<Partial<Company>[]>> {
  //   const res = await this.companyRepository.getCompaniesByUserId(
  //     userId,
  //     limit,
  //     cursor,
  //   );
  //   return {
  //     message: "Companies fetched successfully",
  //     code: RESPONSE_CODE.SUCCESS,
  //     data: res.data.map((company) => ({
  //       organizationId: company.organizationId,
  //       companySize: company.companySize,
  //       taxCode: company.taxCode,
  //       benefits: company.benefits,
  //       companyRawId: company.companyRawId,
  //     })),
  //   };
  // }

  async getCompanyById(
    organizationId: string,
    companyId: string,
  ): Promise<ApiResponse<CompanyWithOrganizationResponseDto>> {
    if (!organizationId) {
      throw new NotFoundException(
        "[CompanyUseCase] - [getCompany] Organization ID is required",
      );
    }
    const organization =
      await this.companyRepository.getCompanyByOrganizationId(
        organizationId,
        companyId,
      );

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

  private mapToCompanyDto(
    organization: OrganizationWithDetails,
  ): CompanyWithOrganizationResponseDto {
    return {
      id: organization.id,
      organizationId: organization.id,
      companySize: organization.companySize || 0,
      taxCode: organization.taxCode || "",
      benefits: organization.benefits || "",
      companyRawId: organization.companyRawId || 0,
      name: organization.name,
      slug: organization.slug,
      type: organization.type,
      description: organization.description || "",
      address: organization.address,
      logoUrl: organization.logoUrl || "",
      about: organization.about || "",
      websiteUrl: organization.websiteUrl || "",
      email: organization.email || "",
      phone: organization.phone || "",
      foundedYear: organization.foundedYear || 0,
      organizationCulture: organization.organizationCulture || "",
      employeesMin: organization.employeesMin || 0,
      employeesMax: organization.employeesMax || 0,
      status: organization.status,
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

  async updateCompanyById(
    organizationId: string,
    companyId: string,
    data: UpdateCompanyWithOrganizationDto,
  ): Promise<ApiResponse<CompanyWithOrganizationResponseDto>> {
    const company = await this.companyRepository.getCompanyByOrganizationId(
      organizationId,
      companyId,
    );
    if (!company) {
      throw new NotFoundException(
        "[CompanyUseCase] - [updateCompanyById] Company not found",
      );
    }

    const [updatedOrganization, updatedCompany] = await Promise.all([
      this.organizationRepository.updateOrganizationById(
        organizationId,
        data.organization,
      ),
      this.companyRepository.updateCompanyById(
        organizationId,
        companyId,
        data.company,
      ),
    ]);

    if (!updatedOrganization || !updatedCompany) {
      throw new BadRequestException(
        "[CompanyUseCase] - [updateCompanyById] Update failed",
      );
    }

    const updatedCompanyWithOrg =
      await this.companyRepository.getCompanyByOrganizationId(
        organizationId,
        companyId,
      );
    return {
      data: this.mapToCompanyDto(updatedCompanyWithOrg!),
      message: "Company updated successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
