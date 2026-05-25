import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  EducationLevelEnum,
  GenderEnum,
  GetUserFeaturesResponse,
  OrganizationTypeEnum,
  OrganizationWithDetails,
  ProviderEnum,
  Skill,
  User,
  UserStatusEnum,
} from "../../core";
import {
  IAuthRepository,
  IBloomFilterService,
  IUserRepository,
  IUserExperienceRepository,
  IUserSkillRepository,
  IUserOnboardingRepository,
  IAuthService,
  ISkillRepository,
} from "../../core/abstracts";
import { Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import {
  RESPONSE_CODE,
  RESPONSE_MESSAGE,
  USER_FOLDER,
} from "@/common/constants";
import {
  ApiResponse,
  GetUserResponseDto,
  TypeAvatar,
  UpdateUserRequestDto,
  UserPublicResponseDto,
  UserOnboardingDto,
  AdminUpdateUserRequestDto,
  UserTrendsResponseDto,
  UserTrendsQueryDto,
} from "@/interfaces/dtos";
import { CloudinaryService } from "@/frameworks/storage/cloudinary/cloudinary.service";
import { PaginatedResult, TokenPayload } from "@/common/types";
import { MultipartFile } from "@fastify/multipart";
import { IOrganizationRepository, UserSkill, UserOnboarding } from "@/core";
import {
  CreateUserExperienceRequestDto,
  UserExperiencesResponseDto,
} from "@/interfaces/dtos";
import { GetAllUserResponse, GetUserQuery } from "@/core/entities/user.entity";
import { CasbinService } from "@/frameworks/auth-services/casbin/casbin.service";
import { RoleEnum } from "@/common/constants";
import {
  CreateUserEducationDto,
  UpdateUserEducationDto,
  UserEducationResponseDto,
} from "@/interfaces/dtos";
import { IUserEducationRepository } from "@/core/abstracts/repositories/user-education-repository.abstract";
import { IUserFeatureUsageRepository } from "@/core/abstracts/repositories/user-feature-usage-repository.abstract";
import { ONE_DAY_MS } from "@/common/constants";
import { addDays } from "date-fns";
import { buildDeletedEmail } from "@/common/utils";
import { buildDeletedPhone } from "@/common/utils";
import { buildDeletedFirebaseUid } from "@/common/utils";
import { ConfigService } from "@nestjs/config/dist/config.service";

@Injectable()
export class UserUseCases implements OnModuleInit {
  private readonly logger = new Logger(UserUseCases.name);

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly userExperienceRepository: IUserExperienceRepository,
    private readonly userSkillRepository: IUserSkillRepository,
    public readonly bloomFilterService: IBloomFilterService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly userOnboardingRepository: IUserOnboardingRepository,
    private readonly authService: IAuthService,
    private readonly authRepository: IAuthRepository,
    private readonly casbinService: CasbinService,
    private readonly userEducationRepository: IUserEducationRepository,
    private readonly userFeatureUsageRepository: IUserFeatureUsageRepository,
    private readonly skillRepository: ISkillRepository,
    private readonly configService: ConfigService,
  ) {}

  // private isUserAccountAvailable(user: User): boolean {
  //   const status = String(user.status);

  //   return (
  //     status !== String(UserStatusEnum.BANNED) &&
  //     status !== String(UserStatusEnum.PENDING_DELETION) &&
  //     status !== String(UserStatusEnum.DELETED)
  //   );
  // }

  private async finalizeUserDeletion(userId: string): Promise<void> {
    const user = await this.userRepository.get(userId);
    if (!user) {
      return;
    }

    const finalizedAt = new Date();
    const timestampMs = finalizedAt.getTime();
    const deletedUsername = `deleted_${user.id}_${timestampMs}`;

    await this.userRepository.executeWithTransaction(async (tx) => {
      await this.authRepository.revokeAllForUser(userId);
      await this.userRepository.update(
        { id: userId },
        {
          status: UserStatusEnum.DELETED,
          username: deletedUsername,
          email: buildDeletedEmail(user, timestampMs),
          phone: buildDeletedPhone(user, timestampMs),
          firebaseUid: buildDeletedFirebaseUid(user, timestampMs),
          deletedAt: finalizedAt,
          purgeAfterAt: null,
          updatedAt: finalizedAt,
        },
        tx,
      );
    });
  }

  async onModuleInit() {
    try {
      await this.initializeBloomFilter();
    } catch (error) {
      this.logger.warn(
        "[UserUseCases] [onModuleInit] Failed to initialize bloom filter:",
        error,
      );
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async refreshBloomFilterScheduled() {
    this.logger.log(
      "[UserUseCases] [refreshBloomFilterScheduled] Starting scheduled Bloom filter refresh...",
    );
    await this.initializeBloomFilter();
  }

  async cleanUpPendingDeletionAccounts() {
    const users = await this.userRepository.getUsersPendingDeletionToFinalize(
      new Date(),
    );

    const results = await Promise.allSettled(
      users.map((user) => this.finalizeUserDeletion(user.id)),
    );

    const failed = results.filter((result) => result.status === "rejected");
    failed.forEach((result) => {
      this.logger.error(
        "[UserUseCases] [finalizePendingDeletionUsers] Failed to finalize pending deletion user",
        result.reason,
      );
    });

    if (users.length > 0) {
      this.logger.log(
        `[UserUseCases] [finalizePendingDeletionUsers] Finalized ${users.length - failed.length}/${users.length} pending deletion account(s)`,
      );
    }
  }

  private async initializeBloomFilter() {
    try {
      // Get all usernames from database
      const users = await this.userRepository.getAll(["username"]);
      const usernames = users.map((user) => user.username);

      this.bloomFilterService.initialize(usernames);

      this.logger.log(
        `[UserUseCases] [initializeBloomFilter] Bloom filter refreshed with ${usernames.length} usernames`,
      );
    } catch (error) {
      this.logger.error(
        "[UserUseCases] [initializeBloomFilter] Failed to initialize bloom filter:",
        error,
      );
      throw error;
    }
  }

  // async getUserById(id: string): Promise<ApiResponse<GetUserResponseDto>> {
  //   const user: User | null = await this.userRepository.get(id);
  //   if (!user || !this.isUserAccountAvailable(user)) {
  //     throw new NotFoundException({
  //       message: RESPONSE_MESSAGE.USER_NOT_FOUND,
  //       code: RESPONSE_CODE.USER_NOT_FOUND,
  //     });
  //   }
  //   const userDto = GetUserResponseDto.from({
  //     ...user,
  //     provider: user.provider as ProviderEnum,
  //     roles: user.roles as RoleEnum[],
  //   });
  //   return {
  //     message: RESPONSE_MESSAGE.SUCCESS,
  //     code: RESPONSE_CODE.SUCCESS,
  //     data: userDto,
  //   };
  // }

  async getUserByAccessToken(
    payload: TokenPayload,
  ): Promise<ApiResponse<GetUserResponseDto>> {
    const id: string = payload.userId;
    const user: User | null = await this.userRepository.get(id);
    if (!user) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.USER_NOT_FOUND,
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
    }

    const loginMethods = await this.userRepository.getUserLoginMethods(user.id);
    const otherProviders = loginMethods
      .filter((m) => m.provider !== user.provider)
      .map((m) => ({
        provider: m.provider as any,
        createdAt: m.createdAt,
        providerUserId: m.providerUserId ?? null,
        providerEmail: m.providerEmail ?? null,
        providerName: m.providerName ?? null,
        providerPicture: m.providerPicture ?? null,
      }));

    const userDto = GetUserResponseDto.from({
      ...user,
      provider: user.provider as ProviderEnum,
      roles: user.roles as RoleEnum[],
      otherProviders,
    });
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: userDto,
    };
  }

  private toFirebaseProviderId(provider: ProviderEnum): string {
    switch (provider) {
      case ProviderEnum.GOOGLE:
        return "google.com";
      case ProviderEnum.FACEBOOK:
        return "facebook.com";
      case ProviderEnum.GITHUB:
        return "github.com";
      case ProviderEnum.EMAIL:
        return "password";
      default:
        return String(provider);
    }
  }

  async unlinkProvider(
    userId: string,
    provider: ProviderEnum,
  ): Promise<ApiResponse<void>> {
    const user: User | null = await this.userRepository.get(userId);
    if (!user) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.USER_NOT_FOUND,
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
    }

    if (!user.firebaseUid) {
      throw new ConflictException({
        message: "User has no firebaseUid",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    if (provider === ProviderEnum.EMAIL) {
      throw new ConflictException({
        message: "Cannot unlink email/password provider",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    if (provider === (user.provider as ProviderEnum)) {
      throw new ConflictException({
        message: "Cannot unlink primary login provider",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    const firebaseProviderId = this.toFirebaseProviderId(provider);
    const deletedAt = new Date();

    const activeIdentityId = await this.userRepository.getActiveUserIdentityId(
      user.id,
      provider,
    );
    if (!activeIdentityId) {
      throw new NotFoundException({
        message: "User identity not found",
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
    }

    try {
      await this.authService.unlinkProvider(
        user.firebaseUid,
        firebaseProviderId,
      );
    } catch (e: any) {
      const errorInfo = e?.errorInfo;
      const errorCode = errorInfo?.code ?? e?.code;
      const errorMessage = errorInfo?.message ?? e?.message;

      if (
        !(
          errorCode === "auth/no-such-provider" ||
          errorCode === "auth/provider-not-linked"
        )
      )
        throw new ConflictException({
          message: errorMessage ?? "Firebase unlink failed",
          code: RESPONSE_CODE.BAD_REQUEST,
        });
    }

    await this.userRepository.softDeleteUserIdentity(
      user.id,
      provider,
      deletedAt,
    );

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async getUserByUsername(
    username: string,
    currentUserId?: string,
  ): Promise<ApiResponse<UserPublicResponseDto>> {
    const user = (await this.userRepository.getByField({ username }))[0];
    if (!user) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.USER_NOT_FOUND,
        code: RESPONSE_MESSAGE.USER_NOT_FOUND,
      });
    }

    const userEducation = await this.userEducationRepository.getByField({
      userId: user.id,
    });

    let school: OrganizationWithDetails | null = null;
    if (userEducation.length > 0) {
      school = await this.organizationRepository.get(
        userEducation[userEducation.length - 1].schoolId,
      );
    }

    const isOwner = currentUserId && currentUserId === user.id;

    const response: UserPublicResponseDto = {
      username: user.username,
      name: user.name,
      avatarUrl: user.avatarUrl,
      gender: user.gender as GenderEnum,
      dob: user.dob,
      bio: user.bio,
      bannerUrl: user.bannerUrl,
      address: user.address,
      school: school?.name || null,
    };

    if (isOwner) {
      const [userOnboarding, skills] = await Promise.all([
        this.userOnboardingRepository.getByField({ userId: user.id }),
        this.skillRepository.getAll(["id", "name"]),
      ]);

      const onboarding = userOnboarding[0];
      if (onboarding) {
        response.provinceIds = onboarding.provinceIds || [];
        response.categoryIds = onboarding.categoryIds || [];
        response.expectedSalary = onboarding.expectedSalary
          ? Number(onboarding.expectedSalary)
          : null;
        response.isSeekingJob = onboarding.isSeekingJob ?? false;
        response.experienceYears = onboarding.experienceYears ?? null;
        response.currentGoal = onboarding.currentGoal ?? null;
        response.skills = skills.filter(
          (skill) =>
            skill.id ===
            (onboarding.skills as string[])?.find((id) => id === skill.id),
        );
      } else {
        response.provinceIds = [];
        response.categoryIds = [];
        response.expectedSalary = null;
        response.isSeekingJob = false;
        response.experienceYears = null;
        response.currentGoal = null;
        response.skills = [];
      }
      response.email = user.email || null;
      response.phone = user.phone || null;
    }

    return {
      message: "User profile fetched successfully",
      code: RESPONSE_MESSAGE.SUCCESS,
      data: response,
    };
  }

  async updateUserProfile(
    userId: string,
    updateUserDto: UpdateUserRequestDto,
  ): Promise<ApiResponse<void>> {
    const user = await this.userRepository.get(userId);
    if (!user) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.USER_NOT_FOUND,
        code: RESPONSE_MESSAGE.USER_NOT_FOUND,
      });
    }

    // Extract preferences from updateUserDto
    const {
      provinceIds,
      categoryIds,
      expectedSalary,
      isSeekingJob,
      experienceYears,
      currentGoal,
      skills,
      ...userUpdateData
    } = updateUserDto;

    const normalizedUserUpdateData = {
      ...userUpdateData,
      ...(userUpdateData.dob !== undefined
        ? { dob: userUpdateData.dob || null }
        : {}),
    };

    const updatedUser = normalizedUserUpdateData;

    try {
      // Update user profile
      const result = await this.userRepository.update(
        {
          id: userId,
        },
        updatedUser,
      );

      if (result.length === 0) {
        throw new NotFoundException({
          message: RESPONSE_MESSAGE.USER_NOT_UPDATED,
          code: RESPONSE_MESSAGE.USER_NOT_UPDATED,
        });
      }

      // Update preferences if provided
      if (
        provinceIds !== undefined ||
        categoryIds !== undefined ||
        expectedSalary !== undefined ||
        isSeekingJob !== undefined ||
        experienceYears !== undefined ||
        currentGoal !== undefined ||
        skills !== undefined
      ) {
        const preferencesUpdate: Partial<UserOnboarding> = {};
        if (provinceIds !== undefined) {
          preferencesUpdate.provinceIds = provinceIds;
        }
        if (categoryIds !== undefined) {
          preferencesUpdate.categoryIds = categoryIds;
        }
        if (expectedSalary !== undefined) {
          preferencesUpdate.expectedSalary = expectedSalary?.toString() || null;
        }
        if (isSeekingJob !== undefined) {
          preferencesUpdate.isSeekingJob = isSeekingJob;
        }
        if (experienceYears !== undefined) {
          preferencesUpdate.experienceYears = experienceYears;
        }
        if (currentGoal !== undefined) {
          preferencesUpdate.currentGoal = currentGoal;
        }
        if (skills !== undefined) {
          preferencesUpdate.skills = skills;
        }

        await this.userOnboardingRepository.upsert(userId, preferencesUpdate);
      }

      return {
        message: "User profile updated successfully",
        code: RESPONSE_MESSAGE.SUCCESS,
      };
    } catch (error: any) {
      this.logger.error(
        `[UserUseCases] - [updateUserProfile] - Error updating user profile: ${error.message}`,
      );
      if (error.cause?.code === "23505") {
        if (error.cause.detail.includes("email")) {
          throw new ConflictException({
            message: RESPONSE_MESSAGE.EMAIL_ALREADY_EXISTS,
            code: RESPONSE_CODE.EMAIL_ALREADY_EXISTS,
          });
        } else if (error.cause.detail.includes("phone")) {
          throw new ConflictException({
            message: RESPONSE_MESSAGE.PHONE_ALREADY_EXISTS,
            code: RESPONSE_CODE.PHONE_ALREADY_EXISTS,
          });
        } else if (error.cause.detail.includes("username")) {
          throw new ConflictException({
            message: RESPONSE_MESSAGE.USERNAME_ALREADY_EXISTS,
            code: RESPONSE_CODE.USERNAME_ALREADY_EXISTS,
          });
        }
      }
      throw error;
    }
  }

  async getUserExperiences(
    username: string,
  ): Promise<ApiResponse<UserExperiencesResponseDto[]>> {
    const userExperiences =
      await this.userExperienceRepository.getUserExperiencesByUsername(
        username,
      );
    if (!userExperiences) {
      throw new NotFoundException({
        message:
          "[getUserExperiences] - [getByUserId] User experiences not found",
        code: RESPONSE_CODE.USER_EXPERIENCE_NOT_FOUND,
      });
    }

    const userExperiencesDto = userExperiences.map((userExperience) => ({
      experience: userExperience.experience,
      organization: userExperience.organization
        ? {
            id: userExperience.organization.id,
            name: userExperience.organization.name,
            address: userExperience.organization.address,
            logoUrl: userExperience.organization.logoUrl,
          }
        : null,
      skills: userExperience.skills.map((skill) => ({
        id: skill.id,
        name: skill.name,
      })),
    }));
    return {
      message: "User experiences fetched successfully",
      code: RESPONSE_MESSAGE.SUCCESS,
      data: userExperiencesDto as UserExperiencesResponseDto[],
    };
  }

  // Create user experience, along with creating new company (if needed) and skills (if needed)
  // [TODO]: It will not reasonable if user work a company twice, need to handle this case later
  async createUserExperience(
    userId: string,
    createUserExperienceDto: CreateUserExperienceRequestDto,
  ): Promise<ApiResponse<number>> {
    const result =
      await this.userExperienceRepository.createUserExperienceWithCompanyAndSkills(
        userId,
        createUserExperienceDto,
      );
    if (!result) {
      throw new NotFoundException({
        message: "[createUserExperience] - [create] User experience not found",
        code: RESPONSE_CODE.USER_EXPERIENCE_NOT_FOUND,
      });
    }
    return {
      message: "User experience created successfully",
      code: RESPONSE_MESSAGE.SUCCESS,
      data: result.id,
    };
  }

  async updateUserExperience(
    userId: string,
    id: number,
    updateUserExperienceDto: CreateUserExperienceRequestDto,
  ): Promise<ApiResponse<number>> {
    const result =
      await this.userExperienceRepository.updateUserExperienceWithCompanyAndSkills(
        userId,
        id,
        updateUserExperienceDto,
      );

    if (!result) {
      this.logger.error(
        "[updateUserExperience] - [updateUserExperienceWithCompanyAndSkills] User experience not found",
      );
      throw new NotFoundException({
        message: "User experience not found",
        code: RESPONSE_CODE.USER_EXPERIENCE_NOT_FOUND,
      });
    }

    return {
      message: "User experience updated successfully",
      code: RESPONSE_MESSAGE.SUCCESS,
      data: 1,
    };
  }

  async deleteUserExperience(
    userId: string,
    id: number,
  ): Promise<ApiResponse<number>> {
    const result =
      await this.userExperienceRepository.deleteUserExperienceAndUserSkills(
        userId,
        id,
      );

    if (result.length === 0) {
      throw new NotFoundException({
        message: "[deleteUserExperience] - [delete] User experience not found",
        code: RESPONSE_CODE.USER_EXPERIENCE_NOT_FOUND,
      });
    }
    return {
      message: "User experience deleted successfully",
      code: RESPONSE_MESSAGE.SUCCESS,
      data: 1,
    };
  }

  async getUserSkills(username: string): Promise<ApiResponse<Skill[]>> {
    const userSkills = await this.userSkillRepository.getUserSkills(username);
    if (!userSkills) {
      throw new NotFoundException({
        message: "[getUserSkills] - [getByUserId] User skills not found",
        code: RESPONSE_CODE.USER_SKILL_NOT_FOUND,
      });
    }
    return {
      message: "User skills fetched successfully",
      code: RESPONSE_MESSAGE.SUCCESS,
      data: userSkills,
    };
  }

  async createUserSkill(
    userId: string,
    skillId: string,
    organizationId: string,
  ): Promise<ApiResponse<UserSkill>> {
    const userSkill = await this.userSkillRepository.create({
      userId,
      skillId,
      organizationId,
    });
    if (!userSkill) {
      throw new NotFoundException({
        message: "[createUserSkill] - [createUserSkill] User skill not found",
        code: RESPONSE_CODE.USER_SKILL_NOT_FOUND,
      });
    }
    return {
      message: "User skill created successfully",
      code: RESPONSE_MESSAGE.SUCCESS,
      data: userSkill,
    };
  }

  async deleteUserSkill(
    userId: string,
    skillId: string,
  ): Promise<
    ApiResponse<{
      skillId: string;
      organizationId: string | null;
    }>
  > {
    const result = await this.userSkillRepository.deletePermanently({
      userId,
      skillId,
    });
    if (result.length === 0) {
      throw new NotFoundException({
        message: "[deleteUserSkill] - [deleteUserSkill] User skill not found",
        code: RESPONSE_CODE.USER_SKILL_NOT_FOUND,
      });
    }
    return {
      message: "User skill deleted successfully",
      code: RESPONSE_MESSAGE.SUCCESS,
      data: {
        skillId: skillId,
        organizationId: null,
      },
    };
  }

  async uploadUserAvatar(
    userId: string,
    file: MultipartFile | undefined,
    type: TypeAvatar,
  ): Promise<ApiResponse<{ url: string; publicId: string; format: string }>> {
    if (!file) {
      throw new NotFoundException({
        message: "[uploadUserAvatar] - No file provided",
        code: RESPONSE_CODE.FILE_NOT_FOUND,
      });
    }
    const result = await this.cloudinaryService.uploadFile(file, {
      folder: USER_FOLDER,
    });
    const user = await this.userRepository.get(userId);
    if (!user) {
      throw new NotFoundException({
        message: "[uploadUserAvatar] - [get] User not found",
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
    }
    const updatedUser = {
      ...user,
      ...(type === TypeAvatar.AVATAR
        ? { avatarUrl: result.secure_url }
        : { bannerUrl: result.secure_url }),
    };
    const updatedUserResult = await this.userRepository.update(
      { id: userId },
      updatedUser,
    );
    if (!updatedUserResult) {
      throw new NotFoundException({
        message: "[uploadUserAvatar] - [update] User not found",
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
    }

    return {
      message: "User avatar uploaded successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: {
        url: result.secure_url,
        publicId: result.public_id,
        format: result.format,
      },
    };
  }

  /**
   * Check if username exists using Bloom Filter (fast check)
   * Returns:
   * - false: Username definitelyfalse does NOT exist (100% accurate)
   * - true: Username MIGHT exist (needs database verification due to possible false positives)
   */
  async checkUserByUsername(
    username: string,
  ): Promise<ApiResponse<{ exists: boolean }>> {
    // Step 1: check bloom filter
    const mightExist = this.bloomFilterService.mightContain(username);
    if (!mightExist) {
      return {
        data: { exists: false },
        message: "Username definitely does not exist",
        code: RESPONSE_CODE.SUCCESS,
      };
    }

    // Step 2: verify DB để loại false positive
    const user = (await this.userRepository.getByField({ username }))[0];

    return {
      data: {
        exists: !!user,
      },
      message: "Username existence checked successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }
  // async checkUserEnterOnboarding(
  //   userId: string,
  // ): Promise<ApiResponse<UserOnboardingStatusDto>> {
  //   const user = await this.userRepository.get(userId);
  //   if (!user) {
  //     throw new NotFoundException({
  //       message: "[checkUserEnterOnboarding] - User not found",
  //       code: RESPONSE_CODE.USER_NOT_FOUND,
  //     });
  //   }
  //   const userOnboarding = await this.userOnboardingRepository.getByField({
  //     userId,
  //   });
  //   console.log("User onboarding record:", userOnboarding);
  //   const isOnboarded = userOnboarding.length > 0;
  //   console.log("User onboarding status:", isOnboarded);
  //   return {
  //     data: {
  //       isOnboarded,
  //     },
  //     message: "User onboarding status checked successfully",
  //     code: RESPONSE_CODE.SUCCESS,
  //   };
  // }

  async completeUserOnboarding(
    userOnboarding: UserOnboardingDto,
    userId: string,
  ): Promise<ApiResponse<void>> {
    const onboarding: Partial<
      Omit<UserOnboardingDto, "name" | "gender" | "dob">
    > = {
      ...userOnboarding,
    };
    const newOnboarding = {
      ...onboarding,
      userId,
    } as Partial<UserOnboarding>;

    const user = await this.userRepository.get(userId);
    if (!user) {
      throw new NotFoundException({
        message: "[completeUserOnboarding] - User not found",
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
    }

    await this.userOnboardingRepository.createOnboardingForUser(
      userId,
      { ...newOnboarding } as UserOnboarding,
      {
        name: userOnboarding.name!,
        gender: userOnboarding.gender!,
        dob: userOnboarding.dob!,
      },
    );
    return {
      message: "User onboarding completed successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async getAllUsers(
    query: GetUserQuery,
  ): Promise<ApiResponse<PaginatedResult<GetAllUserResponse>>> {
    const result = await this.userRepository.getAllWithOffset(query);
    return {
      data: result,
      message: "Users retrieved successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async adminUpdateUser(
    userId: string,
    updateUserDto: AdminUpdateUserRequestDto,
  ): Promise<ApiResponse<GetUserResponseDto>> {
    const user = await this.userRepository.get(userId);
    if (!user) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.USER_NOT_FOUND,
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
    }

    let updateUserClaims = {};
    if (updateUserDto.roles) {
      updateUserClaims = {
        ...updateUserClaims,
        roles: updateUserDto.roles,
      };
    }

    if (Object.keys(updateUserClaims).length > 0) {
      await this.authService.updateUserClaims(
        user.firebaseUid!,
        updateUserClaims,
      );
    }

    const updatePayload: Partial<User> = {
      updatedAt: new Date(),
    };

    if (updateUserDto.roles !== undefined) {
      updatePayload.roles = updateUserDto.roles;
    }

    let currentUser = user;
    if (Object.keys(updatePayload).length > 1) {
      const updatedUserResult = await this.userRepository.update(
        { id: userId },
        updatePayload,
      );
      if (!updatedUserResult || updatedUserResult.length === 0) {
        throw new NotFoundException({
          message: RESPONSE_MESSAGE.USER_NOT_UPDATED,
          code: RESPONSE_CODE.USER_NOT_UPDATED,
        });
      }
      currentUser = updatedUserResult[0];
    }

    const rolesToUpdate = updateUserDto.roles || user.roles;

    if (updateUserDto.roles !== undefined) {
      const existingRoles = await this.casbinService.getRolesForUser(userId);
      for (const existingRole of existingRoles) {
        await this.casbinService.deleteRoleForUser(userId, existingRole);
      }

      for (const role of rolesToUpdate) {
        await this.casbinService.addRoleForUser(userId, role);
      }
      await this.casbinService.savePolicy();
    }

    const loginMethods = await this.userRepository.getUserLoginMethods(userId);
    const otherProviders = loginMethods
      .filter((m) => m.provider !== currentUser.provider)
      .map((m) => ({ provider: m.provider as any, createdAt: m.createdAt }));

    const userDto = GetUserResponseDto.from({
      ...currentUser,
      provider: currentUser.provider as ProviderEnum,
      roles: rolesToUpdate as RoleEnum[],
      otherProviders,
    });
    return {
      message: "User updated successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: userDto,
    };
  }

  async adminDeleteUser(userId: string): Promise<ApiResponse<void>> {
    const user = await this.userRepository.get(userId);
    if (!user) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.USER_NOT_FOUND,
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
    }

    await this.finalizeUserDeletion(userId);

    return {
      message: "User deleted successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: undefined,
    };
  }

  async getUserEducations(
    userId: string,
  ): Promise<ApiResponse<UserEducationResponseDto[]>> {
    const userEducations = await this.userEducationRepository.getByField({
      userId,
    });

    const universities =
      await this.organizationRepository.getOrganizationsByTypes([
        OrganizationTypeEnum.SCHOOL,
        OrganizationTypeEnum.UNIVERSITY,
      ]);

    const universityMap: Record<string, string> = {};

    universities.forEach((university) => {
      universityMap[university.id] = university.name;
    });

    const data: UserEducationResponseDto[] = userEducations.map((entity) => {
      return UserEducationResponseDto.from(entity, universityMap);
    });

    return {
      data: data,
      message: "Get user education successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async createUserEducation(
    userId: string,
    createUserEducationDto: CreateUserEducationDto,
  ): Promise<ApiResponse<UserEducationResponseDto>> {
    const user = await this.userRepository.get(userId);
    if (!user) {
      throw new NotFoundException({
        message: "[createUserEducation] - User not found",
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
    }

    const school = await this.organizationRepository.get(
      createUserEducationDto.schoolId,
    );

    if (!school) {
      throw new NotFoundException({
        message: "[createUserEducation] - School/University not found",
        code: RESPONSE_CODE.ORGANIZATION_NOT_FOUND,
      });
    }

    const newEducation = await this.userEducationRepository.create({
      ...createUserEducationDto,
      userId,
    });

    return {
      data: {
        schoolId: newEducation.schoolId,
        schoolName: school.name,
        startDate: newEducation.startDate,
        endDate: newEducation.endDate,
        description: newEducation.description,
        educationLevel: newEducation.educationLevel as EducationLevelEnum,
        major: newEducation.major,
        gpa: newEducation.gpa,
      },
      message: "User education created successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async updateUserEducation(
    userId: string,
    educationId: string,
    updateUserEducationDto: UpdateUserEducationDto,
  ): Promise<ApiResponse<UserEducationResponseDto>> {
    const userEducation = await this.userEducationRepository.getByField({
      schoolId: educationId,
      userId,
    });

    if (!userEducation || userEducation.length === 0) {
      throw new NotFoundException({
        message: "[updateUserEducation] - User education not found",
        code: RESPONSE_CODE.USER_EDUCATION_NOT_FOUND,
      });
    }

    const updatedEducation = {
      ...userEducation,
      ...updateUserEducationDto,
    };

    const result = (
      await this.userEducationRepository.update(
        { id: userEducation[0].id },
        updatedEducation,
      )
    )[0];

    if (!result) {
      throw new NotFoundException({
        message: "[updateUserEducation] - User education not found",
        code: RESPONSE_CODE.USER_EDUCATION_NOT_FOUND,
      });
    }

    const school = await this.organizationRepository.get(result.schoolId);

    return {
      data: {
        schoolId: result.schoolId,
        schoolName: school ? school.name : "",
        startDate: result.startDate,
        endDate: result.endDate,
        description: result.description,
        educationLevel: result.educationLevel as EducationLevelEnum,
        major: result.major,
        gpa: result.gpa,
      },
      message: "User education updated successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async deleteUserEducation(
    userId: string,
    educationId: string,
  ): Promise<ApiResponse<number>> {
    const userEducation = await this.userEducationRepository.getByField({
      schoolId: educationId,
      userId,
    });

    if (!userEducation || userEducation.length === 0) {
      throw new NotFoundException({
        message: "[deleteUserEducation] - User education not found",
        code: RESPONSE_CODE.USER_EDUCATION_NOT_FOUND,
      });
    }

    const result = await this.userEducationRepository.deletePermanently({
      id: userEducation[0].id,
    });
    if (result.length === 0) {
      throw new NotFoundException({
        message: "[deleteUserEducation] - User education not found",
        code: RESPONSE_CODE.USER_EDUCATION_NOT_FOUND,
      });
    }
    return {
      message: "User education deleted successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: 1,
    };
  }

  async deleteUserAccount(userId: string): Promise<ApiResponse<boolean>> {
    const user = await this.userRepository.get(userId);
    if (!user || String(user.status) === String(UserStatusEnum.DELETED)) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.USER_NOT_FOUND,
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
    }

    if (String(user.status) === String(UserStatusEnum.PENDING_DELETION)) {
      return {
        message: "User account deletion already scheduled",
        code: RESPONSE_CODE.SUCCESS,
        data: true,
      };
    }

    const timeToDeleteAccount = this.configService.get<number>(
      "TIME_TO_DELETE_ACCOUNT_DAYS",
    )!;

    const deletionRequestedAt = new Date();
    const purgeAfterAt = addDays(deletionRequestedAt, timeToDeleteAccount);

    await this.userRepository.executeWithTransaction(async (tx) => {
      await this.authRepository.revokeAllForUser(userId);
      await this.userRepository.update(
        { id: userId },
        {
          status: UserStatusEnum.PENDING_DELETION,
          deletionRequestedAt,
          purgeAfterAt,
          updatedAt: deletionRequestedAt,
        },
        tx,
      );
    });

    return {
      message: "User account scheduled for deletion successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: true,
    };
  }

  async restoreUserAccount(userId: string): Promise<ApiResponse<boolean>> {
    const user = await this.userRepository.get(userId);
    if (!user) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.USER_NOT_FOUND,
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
    }

    if (String(user.status) !== String(UserStatusEnum.PENDING_DELETION)) {
      throw new ConflictException({
        message: "User account is not pending deletion",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    await this.userRepository.update(
      { id: userId },
      {
        status: UserStatusEnum.ACTIVE,
        deletionRequestedAt: null,
        purgeAfterAt: null,
        deletedAt: null,
        updatedAt: new Date(),
      },
    );

    return {
      message: "User account restored successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: true,
    };
  }

  async getUserTrends(
    query: UserTrendsQueryDto,
  ): Promise<ApiResponse<UserTrendsResponseDto>> {
    const trends = await this.userRepository.getUserTrends({
      fromDate: query.fromDate,
      toDate: query.toDate,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        data: trends,
      },
    };
  }
  // [TODO]: Check if any two days have expired -> send notification
  // If expired -> downgrade free subscription
  async getMyFeatures(
    userId: string,
  ): Promise<ApiResponse<GetUserFeaturesResponse>> {
    const now = new Date();
    const current =
      await this.userFeatureUsageRepository.getUserFeatures(userId);

    const candidates = (current.features || [])
      .filter((f) => {
        const last = f.lastRefillAt ? new Date(f.lastRefillAt) : null;
        if (!last) return true;
        return now.getTime() - last.getTime() >= ONE_DAY_MS;
      })
      .map((f) => f.id);

    if (candidates.length) {
      await this.userFeatureUsageRepository.refillExpiredFeatureUsages(
        userId,
        candidates,
        now,
      );
    }

    const features = candidates.length
      ? await this.userFeatureUsageRepository.getUserFeatures(userId)
      : current;

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: features,
    };
  }
}
