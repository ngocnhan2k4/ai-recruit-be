import {
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import { ApiResponse, CompanyDto } from "@/interfaces/dtos";
import { Cron, CronExpression } from "@nestjs/schedule";

import { Company, IBloomFilterService, ICompanyRepository } from "@/core";
import { CompanyFilters } from "@/core/entities/company.entity";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { PaginatedResult } from "@/common/types/api";
@Injectable()
export class CompanyUseCase implements OnModuleInit {
  private readonly logger = new Logger(CompanyUseCase.name);

  constructor(
    private readonly companyRepository: ICompanyRepository,
    public readonly bloomFilterService: IBloomFilterService,
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
