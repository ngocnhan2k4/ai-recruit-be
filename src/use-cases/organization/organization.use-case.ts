import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import {
  EmailJobType,
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
import { IOtpService, OtpPurpose, IEmailQueueStorageService } from "@/core";
import { randomUUID } from "crypto";

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
    private readonly otpService: IOtpService,
    private readonly emailQueueStorage: IEmailQueueStorageService,
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
          { organizationId: orgId },
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
  ): Promise<ApiResponse<"SUCCESS" | "REQUIRE_OTP">> {
    // Get organization to verify it exists
    const org = await this.organizationRepository.get(orgId);
    if (!org) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.ORGANIZATION_NOT_FOUND,
        code: RESPONSE_CODE.ORGANIZATION_NOT_FOUND,
      });
    }

    // If email is already verified, require OTP verification before changing
    if (org.verifiedAt !== null) {
      // Generate OTP with new email in data for verification
      const otp = await this.otpService.generateOtp(
        orgId,
        OtpPurpose.CHANGE_ORGANIZATION_EMAIL,
        { newEmail }, // Store new email in OTP data for later verification
      );

      // Send OTP to the NEW email address
      this.emailQueueStorage.addToQueue({
        id: randomUUID(),
        type: EmailJobType.ORGANIZATION_CHANGE_EMAIL,
        data: {
          to: newEmail,
          organizationName: org.name,
          otpCode: otp,
        },
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(),
      });

      this.logger.log(
        `Email change OTP sent to ${newEmail} for organization ${orgId}`,
      );

      return {
        data: "REQUIRE_OTP",
        message: `OTP verification code has been sent to ${newEmail}. Please verify to complete email change.`,
        code: RESPONSE_CODE.SUCCESS,
      };
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
      data: "SUCCESS",
      message:
        "Organization email updated successfully. Please verify the new email.",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async confirmUpdateOrganizationEmail(
    orgId: string,
    otpCode: string,
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

    // Verify OTP with the new email stored in data
    const isValid = await this.otpService.verifyOtp(
      orgId,
      OtpPurpose.CHANGE_ORGANIZATION_EMAIL,
      otpCode,
      { newEmail }, // Must match the data stored during OTP generation
    );

    if (!isValid) {
      throw new BadRequestException({
        message:
          "Invalid or expired OTP code, or email does not match. Please request a new verification code.",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    // Update organization email and reset verifiedAt to null
    const updated = await this.organizationRepository.update(
      { id: orgId },
      {
        email: newEmail,
        verifiedAt: null, // Reset verification after email change
      },
    );

    if (!updated || updated.length === 0) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.UPDATE_ORGANIZATION_FAILED,
        code: RESPONSE_CODE.UPDATE_ORGANIZATION_FAILED,
      });
    }

    this.logger.log(
      `Organization ${orgId} email updated to ${newEmail} and verification reset`,
    );

    return {
      data: {
        email: newEmail,
        verifiedAt: null,
      },
      message:
        "Organization email updated successfully. Please verify the new email address.",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async sendEmailVerificationOtp(
    orgId: string,
    email: string,
  ): Promise<ApiResponse<{ message: string; expiryMinutes: number }>> {
    // Get organization to verify it exists
    const org = await this.organizationRepository.get(orgId);
    if (!org) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.ORGANIZATION_NOT_FOUND,
        code: RESPONSE_CODE.ORGANIZATION_NOT_FOUND,
      });
    }

    // Check if email matches organization's email
    if (org.email !== email) {
      throw new BadRequestException({
        message:
          "Email does not match organization's email. Please update email first.",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    // Check if already verified
    if (org.verifiedAt) {
      throw new BadRequestException({
        message: "Organization email is already verified.",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    // Generate OTP (use orgId as identifier)
    const otpCode = await this.otpService.generateOtp(
      orgId,
      OtpPurpose.VERIFY_ORGANIZATION_EMAIL,
      {
        email,
      },
    );

    // Send email with OTP via queue
    this.emailQueueStorage.addToQueue({
      id: randomUUID(),
      type: EmailJobType.ORGANIZATION_VERIFICATION,
      data: {
        to: email,
        organizationName: org.name,
        otpCode: otpCode,
      },
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
    });

    this.logger.log(
      `Email verification OTP sent to ${email} for organization ${orgId}`,
    );

    return {
      data: {
        message: `Verification code has been sent to ${email}`,
        expiryMinutes: 10,
      },
      message: "OTP sent successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async verifyOrganizationEmail(
    orgId: string,
    otpCode: string,
    email: string,
  ): Promise<ApiResponse<{ verifiedAt: Date }>> {
    // Get organization to verify it exists
    const org = await this.organizationRepository.get(orgId);
    if (!org) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.ORGANIZATION_NOT_FOUND,
        code: RESPONSE_CODE.ORGANIZATION_NOT_FOUND,
      });
    }

    // Check if email matches
    if (org.email !== email) {
      throw new BadRequestException({
        message: "Email does not match organization's email.",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    // Check if already verified
    if (org.verifiedAt) {
      throw new BadRequestException({
        message: "Organization email is already verified.",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    // Verify OTP
    const isValid = await this.otpService.verifyOtp(
      orgId,
      OtpPurpose.VERIFY_ORGANIZATION_EMAIL,
      otpCode,
      {
        email,
      },
    );

    if (!isValid) {
      throw new BadRequestException({
        message:
          "Invalid or expired OTP code. Please request a new verification code.",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    // Update organization with verified timestamp
    const verifiedAt = new Date();
    const updated = await this.organizationRepository.update(
      { id: orgId },
      { verifiedAt },
    );

    if (!updated || updated.length === 0) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.UPDATE_ORGANIZATION_FAILED,
        code: RESPONSE_CODE.UPDATE_ORGANIZATION_FAILED,
      });
    }

    this.logger.log(
      `Organization email verified successfully for ${orgId} at ${verifiedAt.toISOString()}`,
    );

    return {
      data: { verifiedAt },
      message: "Email verified successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async deleteOrganization(
    orgId: string,
    confirmationName: string,
  ): Promise<ApiResponse<void>> {
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
    await this.organizationRepository.delete({
      id: orgId,
    });
    return {
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
