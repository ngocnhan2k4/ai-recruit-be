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
  OrganizationLocation,
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

  async updateOrganizationBasicInfo(
    orgId: string,
    data: {
      name?: string;
      description?: string;
      websiteUrl?: string;
      phone?: string;
    },
  ): Promise<ApiResponse<OrganizationWithDetails>> {
    const org = await this.organizationRepository.get(orgId);
    if (!org) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.ORGANIZATION_NOT_FOUND,
        code: RESPONSE_CODE.ORGANIZATION_NOT_FOUND,
      });
    }

    // If request body is empty, return success without doing anything
    if (Object.keys(data).length === 0) {
      return {
        data: org,
        message: "Cập nhật thông tin cơ bản thành công",
        code: RESPONSE_CODE.SUCCESS,
      };
    }

    const updatedOrg = await this.organizationRepository.executeWithTransaction(
      async (tx) => {
        // Update organization table with only provided fields
        const updated =
          await this.organizationRepository.updateOrganizationById(
            orgId,
            data,
            tx,
          );

        return updated;
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
      message: "Cập nhật thông tin cơ bản thành công",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async updateOrganizationLocations(
    orgId: string,
    locations: {
      address: string;
      provinceId: string;
    }[],
  ): Promise<
    ApiResponse<{
      id: string;
      locations: OrganizationLocation[];
    }>
  > {
    const org = await this.organizationRepository.get(orgId);
    if (!org) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.ORGANIZATION_NOT_FOUND,
        code: RESPONSE_CODE.ORGANIZATION_NOT_FOUND,
      });
    }

    const updatedLocations =
      await this.organizationRepository.executeWithTransaction(async (tx) => {
        // Delete all existing locations for this organization
        await this.organizationLocationRepository.deletePermanently(
          { organizationId: orgId } as any,
          tx,
        );

        // Create new locations if array is not empty
        if (locations.length > 0) {
          const createdLocations =
            await this.organizationLocationRepository.createOrganizationLocations(
              locations.map((loc) => ({
                address: loc.address,
                provinceId: loc.provinceId,
                organizationId: orgId,
              })),
              tx,
            );
          return createdLocations;
        }

        return [];
      });

    return {
      data: {
        id: orgId,
        locations: updatedLocations,
      },
      message: "Cập nhật địa chỉ thành công",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async updateOrganizationAdditionalInfo(
    orgId: string,
    data: {
      culture?: string;
      benefits?: string;
    },
  ): Promise<ApiResponse<OrganizationWithDetails>> {
    const org = await this.organizationRepository.get(orgId);
    if (!org) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.ORGANIZATION_NOT_FOUND,
        code: RESPONSE_CODE.ORGANIZATION_NOT_FOUND,
      });
    }

    // Only allow update for COMPANY type organizations
    if (org.type !== OrganizationTypeEnum.COMPANY) {
      throw new BadRequestException({
        message:
          "Additional info (culture, benefits) is only available for companies",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    // If request body is empty, return success without doing anything
    if (Object.keys(data).length === 0) {
      return {
        data: org,
        message: "Cập nhật thông tin bổ sung thành công",
        code: RESPONSE_CODE.SUCCESS,
      };
    }

    const updatedOrg = await this.organizationRepository.executeWithTransaction(
      async (tx) => {
        // Update company-specific fields
        await this.companyRepository.update(
          { organizationId: orgId },
          {
            culture: data.culture,
            benefits: data.benefits,
          },
          tx,
        );

        // Get updated organization with details
        const updated = await this.organizationRepository.get(orgId);
        return updated;
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
      message: "Cập nhật thông tin bổ sung thành công",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async updateOrganizationEmail(
    orgId: string,
    newEmail: string,
  ): Promise<ApiResponse<{ email: string; verifiedAt: null }>> {
    // Get organization to verify it exists
    const org = await this.organizationRepository.get(orgId);
    if (!org) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.ORGANIZATION_NOT_FOUND,
        code: RESPONSE_CODE.ORGANIZATION_NOT_FOUND,
      });
    }

    // Update email and reset verifiedAt
    const updated = await this.organizationRepository.update(
      { id: orgId },
      {
        email: newEmail,
        verifiedAt: null, // Reset verification when email changes
      },
    );

    if (!updated || updated.length === 0) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.UPDATE_ORGANIZATION_FAILED,
        code: RESPONSE_CODE.UPDATE_ORGANIZATION_FAILED,
      });
    }

    return {
      data: {
        email: newEmail,
        verifiedAt: null,
      },
      message:
        "Organization email updated successfully. Please verify the new email.",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async deleteOrganization(
    orgId: string,
    confirmationName: string,
  ): Promise<ApiResponse<boolean>> {
    // Get organization to verify name
    const org = await this.organizationRepository.get(orgId);
    if (!org) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.ORGANIZATION_NOT_FOUND,
        code: RESPONSE_CODE.ORGANIZATION_NOT_FOUND,
      });
    }

    // Verify confirmation name matches
    if (org.name !== confirmationName) {
      throw new BadRequestException({
        message:
          "Organization name confirmation does not match. Please enter the exact organization name to confirm deletion.",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    // Soft delete
    const deleted = await this.organizationRepository.delete({
      id: orgId,
    });

    return {
      data: !!deleted,
      message: "Organization deleted successfully",
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
