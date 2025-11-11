import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  IOrganizationRepository,
  OrganizationRoleEnum,
  OrganizationWithDetails,
} from "@/core";
import {
  ApiResponse,
  CreateOrganizationDto,
  OrganizationWithDetailsDto,
  UpdateOrganizationDto,
} from "@/interfaces/dtos";
import { CheckOrganizationNameResponseDto } from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { PaginatedResult } from "@/common/types/api";
import { OrganizationQuery } from "@/core/entities/organization.entity";
import { IOrganizationMembersRepository } from "@/core/abstracts/repositories/organization-members-repository.abstract";
import { slugify } from "@/common/utils/string";

@Injectable()
export class OrganizationUseCase {
  private readonly logger = new Logger(OrganizationUseCase.name);

  constructor(
    private readonly organizationRepository: IOrganizationRepository,
    private readonly organizationMembersRepository: IOrganizationMembersRepository,
  ) {}

  async checkOrganizationName(
    orgName: string,
  ): Promise<ApiResponse<CheckOrganizationNameResponseDto>> {
    const mightExist = await this.organizationRepository.checkNameMightExist(
      orgName,
      0.6,
    );

    console.log("mightExist", mightExist);

    return {
      data: {
        exists: mightExist,
      },
      message: "Organization name existence checked successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async createOrganization(
    data: CreateOrganizationDto,
    userId: string,
  ): Promise<ApiResponse<OrganizationWithDetails>> {
    const slug = this.generateSlug(data.name, new Date());
    const result = await this.organizationRepository.createOrganization(
      {
        ...data,
        slug,
      },
      userId,
    );
    if (!result) {
      throw new BadRequestException(
        "[OrganizationUseCase] - [createOrganization] Failed to create organization",
      );
    }
    return {
      data: result,
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async updateOrganization(
    orgId: string,
    data: UpdateOrganizationDto,
  ): Promise<ApiResponse<OrganizationWithDetails>> {
    const result = await this.organizationRepository.updateOrganizationById(
      orgId,
      data,
    );
    if (!result) {
      throw new NotFoundException(
        `[OrganizationUseCase] - [updateOrganization] Organization with ID ${orgId} not found`,
      );
    }
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    };
  }

  async deleteOrganization(id: string): Promise<ApiResponse<boolean>> {
    const result = await this.organizationRepository.deleteOrganizationById(id);
    if (!result) {
      throw new NotFoundException(
        `[OrganizationUseCase] - [deleteOrganization] Organization with ID ${id} not found`,
      );
    }
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    };
  }

  async getOrganizationById(
    id: string,
    userId?: string,
  ): Promise<ApiResponse<OrganizationWithDetailsDto | null>> {
    const org = await this.organizationRepository.getOrganizationById(id);
    if (!org) {
      throw new NotFoundException(
        `[OrganizationUseCase] - [getOrganizationById] Organization with ID ${id} not found`,
      );
    }

    let role: string = OrganizationRoleEnum.ANONYMOUSLY;

    // get role of user
    if (userId) {
      const userRole = await this.organizationMembersRepository.getMemberRole(
        id,
        userId,
      );
      role = userRole ?? OrganizationRoleEnum.ANONYMOUSLY;
    }

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: {
        ...org,
        role: role as OrganizationRoleEnum,
      },
    };
  }

  async getOrganizationsByOwner(
    userId: string,
    query: OrganizationQuery,
  ): Promise<
    ApiResponse<
      PaginatedResult<
        Pick<
          OrganizationWithDetails,
          | "id"
          | "name"
          | "logoUrl"
          | "description"
          | "foundedYear"
          | "verifiedAt"
        >
      >
    >
  > {
    const result = await this.organizationRepository.getAllOrganizations({
      ...query,
      userId: userId,
    });
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    };
  }

  async getAllOrganizations(
    query: OrganizationQuery,
  ): Promise<
    ApiResponse<
      PaginatedResult<
        Pick<
          OrganizationWithDetails,
          | "id"
          | "name"
          | "description"
          | "logoUrl"
          | "foundedYear"
          | "verifiedAt"
        >
      >
    >
  > {
    const result = await this.organizationRepository.getAllOrganizations(query);
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: result,
    };
  }

  generateSlug(name: string, time: Date): string {
    const baseSlug = slugify(name);
    // base36
    const shortTime = time.getTime().toString(36).slice(-5);

    return `${baseSlug}-${shortTime}`;
  }
}
