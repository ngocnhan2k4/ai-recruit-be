import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import {
  ApiResponse,
  UpdateCompanyWithOrganizationDto,
  CompanyDto,
  CreateCompanyWithOrganizationDto,
} from "@/interfaces/dtos";
import { Cron, CronExpression } from "@nestjs/schedule";

import {
  Company,
  IBloomFilterService,
  ICompanyRepository,
  IOrganizationRepository,
} from "@/core";
import { CompanyFilters } from "@/core/entities/company.entity";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { PaginatedResult } from "@/common/types/api";
import { slugify } from "@/common/utils/string";
@Injectable()
export class CompanyUseCase implements OnModuleInit {
  private readonly logger = new Logger(CompanyUseCase.name);

  constructor(
    private readonly companyRepository: ICompanyRepository,
    public readonly bloomFilterService: IBloomFilterService,
    private readonly organizationRepository: IOrganizationRepository,
  ) {}

  onModuleInit(): void {
    // start initialization in background so Nest bootstrap is not blocked
    // any requests arriving before bloom is ready will fallback to DB verification
    this.initializeBloomFilter().catch((err) =>
      this.logger.error("[CompanyUseCase] Bloom init failed (background)", err),
    );
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshBloomFilterScheduled() {
    this.logger.log(
      "[UserUseCases] [refreshBloomFilterScheduled] Starting scheduled Bloom filter refresh...",
    );
    await this.initializeBloomFilter();
  }

  private async initializeBloomFilter() {
    try {
      // Get all company names from database
      const companies = await this.companyRepository.getAll(["name"]);
      // TODO: fix logic organization here
      const companyNames = companies.map((company) => company.name);

      this.bloomFilterService.initialize(companyNames);

      this.logger.log(
        `[CompanyUseCases] [initializeBloomFilter] Bloom filter refreshed with ${companyNames.length} company names`,
      );
    } catch (error) {
      this.logger.error(
        "[CompanyUseCases] [initializeBloomFilter] Failed to initialize bloom filter:",
        error,
      );
      throw error;
    }
  }

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

  // [TODO-PHAT]: move this logic into repository layer to using transaction
  async createCompany(
    userId: string,
    data: CreateCompanyWithOrganizationDto,
  ): Promise<ApiResponse<Company>> {
    const slug = await this.generateSlug(data.organization.name);
    const company = await this.companyRepository.createCompany(
      {
        ...data.company,
        ...data.organization,
        slug,
      },
      userId,
    );
    if (!company) {
      throw new BadRequestException(
        "[CompanyUseCase] - [createCompany] Failed to create company",
      );
    }
    return {
      message: "Company created successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: company,
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

  // [TODO-PHAT]: move this logic into organization repository layer to using transaction
  async updateCompanyById(
    organizationId: string,
    data: UpdateCompanyWithOrganizationDto,
  ): Promise<ApiResponse<CompanyDto>> {
    const updatedCompanyWithOrg =
      await this.companyRepository.updateCompanyById(organizationId, {
        ...data.company,
        ...data.organization,
      });
    if (!updatedCompanyWithOrg) {
      throw new NotFoundException(
        `[CompanyUseCase] - [updateCompanyById] Company with Organization ID ${organizationId} not found`,
      );
    }
    return {
      data: this.mapToCompanyDto(updatedCompanyWithOrg),
      message: "Company updated successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async generateSlug(name: string): Promise<string> {
    const baseSlug = slugify(name);
    let slug = baseSlug;
    let suffix;

    while (true) {
      const existingOrg = await this.organizationRepository.getByField({
        slug,
      });
      if (!existingOrg) {
        break;
      }
      suffix = suffix ? suffix + 1 : 1;
      slug = `${baseSlug}-${suffix}`;
    }
    return slug;
  }
}
