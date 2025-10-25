import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import {
  ApiResponse,
  CheckOrganizationNameResponseDto,
  CompanyWithOrganizationResponseDto,
  GetCompaniesQueryDto,
  UpdateCompanyWithOrganizationDto,
  CreateCompanyDto,
  GetCompanyDto,
} from "@/interfaces/dtos";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  PaginatedResultDto,
  PaginationResponseDto,
} from "@/interfaces/dtos/common/query";
import {
  Company,
  IBloomFilterService,
  ICompanyRepository,
  IOrganizationRepository,
} from "@/core";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { PaginatedResult } from "@/common/types/api";
import { OrganizationRole } from "@/common/constants/organization-roles";
import { IOrganizationMembersRepository } from "@/core/abstracts/repositories/organization-members.abstract";
import { OrganizationWithDetails } from "@/core/entities";
@Injectable()
export class CompanyUseCase implements OnModuleInit {
  private readonly logger = new Logger(CompanyUseCase.name);

  constructor(
    private readonly companyRepository: ICompanyRepository,
    private readonly organizationMembersRepository: IOrganizationMembersRepository,
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
      const companies = await this.companyRepository.getAll();
      // TODO: fix logic organization here
      const companyNames = companies.map((company) => company.organizationId);

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

  // async getCompanies(
  //   limit = 20,
  //   filter?: CompanyFilters,
  //   cursor?: string,
  // ): Promise<
  //   ApiResponse<
  //     PaginatedResult<
  //       Pick<OrganizationWithDetails, "id" | "name" | "logoUrl" | "address">
  //     >
  //   >
  // > {
  //   const result = await this.companyRepository.getCompanies(
  //     limit,
  //     filter,
  //     cursor,
  //   );
  //   return {
  //     message: RESPONSE_MESSAGE.SUCCESS,
  //     code: RESPONSE_CODE.SUCCESS,
  //     data: result,
  //   };
  // }

  // TODO: fix logic organization here
  async checkOrganizationName(
    orgName: string,
  ): Promise<ApiResponse<CheckOrganizationNameResponseDto>> {
    // if bloom is not ready, fallback to DB verification to avoid false-negatives
    const bloomReady = (this.bloomFilterService as any)?.isReady?.() ?? true;
    const mightExist = bloomReady
      ? this.bloomFilterService.mightContain(orgName)
      : true;

    if (!mightExist) {
      return {
        data: { exists: false },
        message: "Organization name does not exist",
        code: RESPONSE_CODE.SUCCESS,
      };
    }

    this.logger.log(
      `[CompanyUseCase] [checkOrganizationName] Checking organization name "${orgName}"...`,
    );

    // Step 2: verify DB để loại false positive
    const organization = await this.organizationRepository.getByField({
      name: orgName,
    });
    this.logger.log(
      `[CompanyUseCase] [checkOrganizationName] Checked organization name "${orgName}": BloomFilter mightExist=${mightExist}, DB exists=${!!organization}`,
    );

    return {
      data: {
        exists: !!organization,
      },
      message: "Organization name existence checked successfully",
      code: RESPONSE_CODE.SUCCESS,
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
  //   query: GetCompaniesQueryDto,
  // ): Promise<ApiResponse<PaginatedResultDto<Partial<Company>>>> {
  //   const res = await this.companyRepository.getCompaniesByUserId(
  //     userId,
  //     query.limit,
  //     query.cursor,
  //   );
  //   return {
  //     message: "Companies fetched successfully",
  //     code: RESPONSE_CODE.SUCCESS,
  //     data: res,
  //   };
  // }
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
