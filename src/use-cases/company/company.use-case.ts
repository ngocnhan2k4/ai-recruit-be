import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from "@nestjs/common";
import {
  ApiResponse,
  CheckOrganizationNameResponseDto,
  GetCompaniesQueryDto,
} from "@/interfaces/dtos";
import { CreateCompanyDto } from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import {
  Company,
  CompanyFilters,
  IBloomFilterService,
  ICompanyRepository,
} from "@/core";
import { PaginatedResult } from "@/common/types/api";
import { OrganizationRole } from "@/common/constants/organization-roles";
import { IOrganizationMembersRepository } from "@/core/abstracts/repositories/organization-members.abstract";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  PaginatedResultDto,
  PaginationResponseDto,
} from "@/interfaces/dtos/common/query";

@Injectable()
export class CompanyUseCase implements OnModuleInit {
  private readonly logger = new Logger(CompanyUseCase.name);

  constructor(
    private readonly companyRepository: ICompanyRepository,
    private readonly organizationMembersRepository: IOrganizationMembersRepository,
    public readonly bloomFilterService: IBloomFilterService,
  ) {}

  async onModuleInit() {
    await this.initializeBloomFilter();
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

  async getAllCompanies(): Promise<
    ApiResponse<Pick<Company, "id" | "name" | "logoUrl" | "address">[]>
  > {
    const result = await this.companyRepository.getAllCompanies();

    return {
      message: "Companies retrieved successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    };
  }

  async getCompanies(
    limit = 20,
    filter?: CompanyFilters,
    cursor?: string,
  ): Promise<
    ApiResponse<
      PaginatedResult<
        Pick<Company, "id" | "name" | "logoUrl" | "address" | "locations">
      >
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

  async checkOrganizationName(
    orgName: string,
  ): Promise<ApiResponse<CheckOrganizationNameResponseDto>> {
    const mightExist = this.bloomFilterService.mightContain(orgName);
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
    const organization = await this.companyRepository.getByField({
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
      organizationId: organization.id,
      role: OrganizationRole.ORGANIZATION_OWNER,
    });
    if (!organizationMember) {
      await this.companyRepository.delete({
        id: organization.id,
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

  async getCompaniesByUserId(
    userId: string,
    query: GetCompaniesQueryDto,
  ): Promise<ApiResponse<PaginatedResultDto<Partial<Company>>>> {
    const res = await this.companyRepository.getCompaniesByUserId(
      userId,
      query.limit,
      query.cursor,
    );
    return {
      message: "Companies fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: res,
    };
  }

  async getCompany(
    userId?: string,
    companyId?: string,
  ): Promise<ApiResponse<Company & { role: string }>> {
    if (!companyId) {
      throw new NotFoundException(
        "[CompanyUseCase] - [getCompany] Company ID is required",
      );
    }
    const company = await this.companyRepository.get(companyId);
    if (!company) {
      throw new NotFoundException(
        "[CompanyUseCase] - [getCompany] Company not found",
      );
    }
    const role = userId
      ? await this.organizationMembersRepository
          .findMemberByUserIdAndOrganizationId(userId, companyId)
          .then((member) =>
            member ? member.role : OrganizationRole.ANONYMOUSLY,
          )
      : OrganizationRole.ANONYMOUSLY;
    this.logger.log("[CompanyUseCase] - [getCompany]: ", {
      userId,
      companyId,
      role,
    });
    return {
      data: { ...company, role },
      message: "Company fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
