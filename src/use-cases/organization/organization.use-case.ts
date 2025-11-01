import { Injectable, Logger } from "@nestjs/common";
import {
  IBloomFilterService,
  IOrganizationRepository,
  OrganizationWithDetails,
} from "@/core";
import { Cron, CronExpression } from "@nestjs/schedule";
import { ApiResponse } from "@/interfaces/dtos";
import { CheckOrganizationNameResponseDto } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/response";
import { GeneralQuery, PaginatedResult } from "@/common/types/api";
import { IOrganizationMembersRepository } from "@/core/abstracts/repositories/organization-members.abstract";

// [TODO-PHAT]: check logic organization here
@Injectable()
export class OrganizationUseCase {
  private readonly logger = new Logger(OrganizationUseCase.name);

  constructor(
    public readonly bloomFilterService: IBloomFilterService,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly organizationMembersRepository: IOrganizationMembersRepository,
  ) {}

  onModuleInit(): void {
    // start initialization in background so Nest bootstrap is not blocked
    // any requests arriving before bloom is ready will fallback to DB verification
    this.initializeBloomFilter().catch((err) =>
      this.logger.error(
        "[OrganizationUseCase] Bloom init failed (background)",
        err,
      ),
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
      const organizations = await this.organizationRepository.getAll(["name"]);
      const organizationNames = organizations.map(
        (organization) => organization.name,
      );

      this.bloomFilterService.initialize(organizationNames);

      this.logger.log(
        `[CompanyUseCases] [initializeBloomFilter] Bloom filter refreshed with ${organizationNames.length} organization names`,
      );
    } catch (error) {
      this.logger.error(
        "[CompanyUseCases] [initializeBloomFilter] Failed to initialize bloom filter:",
        error,
      );
      throw error;
    }
  }

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
      `[OrganizationUseCase] [checkOrganizationName] Checking organization name "${orgName}"...`,
    );

    // Step 2: verify DB để loại false positive
    const organization = await this.organizationRepository.getByField({
      name: orgName,
    });
    this.logger.log(
      `[OrganizationUseCase] [checkOrganizationName] Checked organization name "${orgName}": BloomFilter mightExist=${mightExist}, DB exists=${!!organization}`,
    );

    return {
      data: {
        exists: !!organization,
      },
      message: "Organization name existence checked successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async createOrganization(_data: any) {}

  async updateOrganization(_orgId: string, _data: any) {}

  async deleteOrganization(_id: string) {}

  async getOrganizationById(_id: string, _userId: string) {}

  async getOrganizationsByOwner(_userId: string, _query: any) {}

  async getAllOrganizations(
    query: GeneralQuery,
  ): Promise<
    ApiResponse<
      PaginatedResult<
        Pick<
          OrganizationWithDetails,
          "id" | "name" | "description" | "logoUrl" | "foundedYear"
        >
      >
    >
  > {
    const result = await this.organizationRepository.getAllOrganizations(query);
    return {
      message: "Get organization of owner",
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    };
  }

  // async getMembersByOrganizationId(
  //   organizationId: string,
  //   cursor: string,
  //   limit: number,
  //   filter?: MemberFilter,
  // ) : Promise<ApiResponse<>>
}
