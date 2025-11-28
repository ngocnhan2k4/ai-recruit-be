import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  ICompanyRepository,
  IOrganizationMemberInvitationRepository,
  IOrganizationMembersRepository,
  IOrganizationRepository,
  ISchoolRepository,
  OrganizationRoleEnum,
  OrganizationTypeEnum,
  OrganizationWithDetails,
  User,
} from "@/core";
import {
  ApiResponse,
  CreateOrganizationDto,
  GeneralQueryDto,
  OrganizationWithDetailsDto,
  PaginatedResultDto,
  UpdateOrganizationDto,
} from "@/interfaces/dtos";
import { CheckOrganizationNameResponseDto } from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { PaginatedResult } from "@/common/types/api";
import { OrganizationQuery } from "@/core/entities/organization.entity";
import { slugify } from "@/common/utils/string";
import { IOrganizationLocationRepository } from "@/core/abstracts/repositories/organization-location-repository.abstract";
import { CloudinaryService } from "@/frameworks/storage/cloudinary/cloudinary.service";
import { MultipartFile } from "@fastify/multipart";

@Injectable()
export class OrganizationUseCase {
  private readonly logger = new Logger(OrganizationUseCase.name);

  constructor(
    private readonly organizationRepository: IOrganizationRepository,
    private readonly organizationMembersRepository: IOrganizationMembersRepository,
    private readonly organizationLocationRepository: IOrganizationLocationRepository,
    private readonly organizationMemberInvitationRepository: IOrganizationMemberInvitationRepository,
    private readonly companyRepository: ICompanyRepository,
    private readonly schoolRepository: ISchoolRepository,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async checkOrganizationName(
    orgName: string,
  ): Promise<ApiResponse<CheckOrganizationNameResponseDto>> {
    const mightExist = await this.organizationRepository.checkNameMightExist(
      orgName,
      0.6,
    );

    return {
      data: {
        exists: mightExist,
      },
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async createOrganization(
    data: CreateOrganizationDto,
    userId: string,
  ): Promise<ApiResponse<OrganizationWithDetails>> {
    const result = await this.organizationRepository.executeWithTransaction(
      async (tx) => {
        const slug = this.generateSlug(data.name, new Date());
        const org = await this.organizationRepository.createOrganization(
          {
            ...data,
            slug,
          },
          tx,
        );

        await this.organizationMembersRepository.create(
          {
            organizationId: org.id,
            userId: userId,
            role: OrganizationRoleEnum.ORGANIZATION_OWNER,
          },
          tx,
        );
        const { locations, ...rest } = data;
        let createdCom = {};
        let createdSch = {};
        if (data.type === OrganizationTypeEnum.COMPANY) {
          createdCom = await this.companyRepository.create(
            {
              organizationId: org.id,
              ...rest,
            },
            tx,
          );
        } else if (data.type === OrganizationTypeEnum.SCHOOL) {
          createdSch = await this.schoolRepository.createSchool(
            {
              ...data,
              organizationId: org.id,
              schoolType: data?.schoolType as any,
            },
            tx,
          );
        }

        const createdLocations =
          await this.organizationLocationRepository.createOrganizationLocations(
            locations?.map((loc) => ({
              ...loc,
              organizationId: org.id,
            })),
            tx,
          );

        return {
          ...org,
          ...createdCom,
          ...createdSch,
          locations: createdLocations,
        };
      },
    );
    if (!result) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.CREATE_ORGANIZATION_FAILED,
        code: RESPONSE_CODE.CREATE_ORGANIZATION_FAILED,
      });
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
    const updatedOrg = await this.organizationRepository.executeWithTransaction(
      async (tx) => {
        const org = await this.organizationRepository.updateOrganizationById(
          orgId,
          {
            ...data,
          },
          tx,
        );

        let updatedCompany = {};
        let updatedSchool = {};

        if (org.type === OrganizationTypeEnum.COMPANY) {
          updatedCompany = await this.companyRepository.update(
            {
              organizationId: org.id,
            },
            {
              ...data,
              organizationId: org.id,
            },
            tx,
          );
        } else if (org.type === OrganizationTypeEnum.SCHOOL) {
          updatedSchool = await this.schoolRepository.updateSchool(
            orgId,
            {
              ...data,
              organizationId: org.id,
              schoolType: data?.schoolType as any,
            },
            tx,
          );
        }

        return {
          ...org,
          ...(updatedCompany ? updatedCompany : {}),
          ...(updatedSchool ? updatedSchool : {}),
        };
      },
    );

    if (!updatedOrg) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.UPDATE_ORGANIZATION_FAILED,
        code: RESPONSE_CODE.UPDATE_ORGANIZATION_FAILED,
      });
    }

    return {
      data: updatedOrg,
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async deleteOrganization(orgId: string): Promise<ApiResponse<boolean>> {
    const deleted = await this.organizationRepository.delete({
      id: orgId,
    });
    return {
      data: !!deleted,
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async getOrganizationById(
    id: string,
    userId?: string,
  ): Promise<ApiResponse<OrganizationWithDetailsDto | null>> {
    const org = await this.organizationRepository.getOrganizationById(id);
    if (!org) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.ORGANIZATION_NOT_FOUND,
        code: RESPONSE_CODE.ORGANIZATION_NOT_FOUND,
      });
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
    const result = await this.organizationRepository.getMyOrganizations(
      userId,
      query,
    );
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

  async getUsersToInvite(
    _organizationId: string,
    query: GeneralQueryDto,
  ): Promise<
    ApiResponse<
      PaginatedResultDto<Pick<
        User,
        "id" | "name" | "email" | "avatarUrl" | "username"
      > | null>
    >
  > {
    const usersToInvite =
      await this.organizationMemberInvitationRepository.getUsersToInvite(query);

    return {
      data: {
        data: usersToInvite.data,
        pagination: usersToInvite.pagination,
      },
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async updateOrganizationLogo(
    orgId: string,
    file: MultipartFile,
  ): Promise<ApiResponse<{ logoUrl: string }>> {
    // Validate file (images only, max 5MB)
    await this.cloudinaryService.validateFile(file, {
      maxSize: 5 * 1024 * 1024, // 5MB
      allowedTypes: ["image/jpeg", "image/png", "image/jpg", "image/webp"],
    });

    // Upload to Cloudinary
    const uploadResult = await this.cloudinaryService.uploadFile(file);

    if (!uploadResult || !uploadResult.secure_url) {
      throw new BadRequestException({
        message: "Failed to upload logo",
        code: RESPONSE_CODE.SERVER_ERROR,
      });
    }

    // Update organization logo URL
    const updated = await this.organizationRepository.update(
      { id: orgId },
      { logoUrl: uploadResult.secure_url },
    );

    if (!updated || updated.length === 0) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.UPDATE_ORGANIZATION_FAILED,
        code: RESPONSE_CODE.UPDATE_ORGANIZATION_FAILED,
      });
    }

    return {
      data: { logoUrl: uploadResult.secure_url },
      message: "Organization logo updated successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  generateSlug(name: string, time: Date): string {
    const baseSlug = slugify(name);
    // base36
    const shortTime = time.getTime().toString(36).slice(-5);

    return `${baseSlug}-${shortTime}`;
  }
}
