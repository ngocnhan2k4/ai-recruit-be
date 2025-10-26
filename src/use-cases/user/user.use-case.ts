import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  GenderEnum,
  ProviderEnum,
  Skill,
  User,
  UserStatusEnum,
} from "../../core";
import {
  IBloomFilterService,
  IUserRepository,
  IUserExperienceRepository,
  IUserSkillRepository,
  IUserOnboardingRepository,
  IAuthService,
} from "../../core/abstracts";
import { Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import {
  ApiResponse,
  GetUserResponseDto,
  TypeAvatar,
  UpdateUserRequestDto,
  UserPublicResponseDto,
  UserOnboardingDto,
  GetAllUserResponseDto,
  AdminUpdateUserRequestDto,
} from "@/interfaces/dtos";
import { CloudinaryService } from "@/frameworks/storage/cloudinary/cloudinary.service";
import { TokenPayload } from "@/common/types/token";
import { MultipartFile } from "@fastify/multipart";
import {
  IOrganizationRepository,
  UserSkill,
  UserOnboarding,
  ISkillRepository,
} from "@/core";
import {
  CreateUserExperienceRequestDto,
  UserExperiencesResponseDto,
} from "@/interfaces/dtos/users/user-experience.dto";
import { GetUserQuery } from "@/core/entities/user.entity";
import { PaginatedResultDto } from "@/interfaces/dtos/common/query";
import { CasbinService } from "@/frameworks/auth-services/casbin/casbin.service";

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
    private readonly skillRepository: ISkillRepository,
    private readonly authService: IAuthService,
    private readonly casbinService: CasbinService,
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
      // Get all usernames from database
      const users = await this.userRepository.getAll();
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

  async getUserById(id: string): Promise<ApiResponse<GetUserResponseDto>> {
    const user: User | null = await this.userRepository.get(id);
    if (!user) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.USER_NOT_FOUND,
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
    }
    const userDto = GetUserResponseDto.from({
      ...user,
      provider: user.provider as ProviderEnum,
      onboardingCompleted: (user as any).onboardingCompleted ?? undefined,
    });
    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: userDto,
    };
  }

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
    const userDto = GetUserResponseDto.from({
      ...user,
      provider: user.provider as ProviderEnum,
      onboardingCompleted: undefined,
    });
    const userOnboarding = await this.userOnboardingRepository.getByField({
      userId: id,
    });
    const isOnboarded = userOnboarding.length > 0;
    userDto.onboardingCompleted = isOnboarded;

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: userDto,
    };
  }

  async getUserByUsername(
    username: string,
  ): Promise<ApiResponse<UserPublicResponseDto>> {
    const user = (await this.userRepository.getByField({ username }))[0];
    if (!user) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.USER_NOT_FOUND,
        code: RESPONSE_MESSAGE.USER_NOT_FOUND,
      });
    }
    return {
      message: "User profile fetched successfully",
      code: RESPONSE_MESSAGE.SUCCESS,
      data: {
        username: user.username,
        name: user.name,
        avatarUrl: user.avatarUrl,
        gender: user.gender as GenderEnum,
        dob: user.dob,
        bio: user.bio,
        bannerUrl: user.bannerUrl,
        address: user.address,
      },
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

    const updatedUser = {
      ...user,
      ...updateUserDto,
    };

    try {
      const result = (
        await this.userRepository.update(
          {
            id: userId,
          },
          updatedUser,
        )
      )[0];

      if (!result) {
        throw new NotFoundException({
          message: RESPONSE_MESSAGE.USER_NOT_UPDATED,
          code: RESPONSE_MESSAGE.USER_NOT_UPDATED,
        });
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
    const result = (
      await this.userExperienceRepository.delete({
        userId,
        id,
      })
    )[0];
    if (!result) {
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
    const result = (
      await this.userSkillRepository.delete({
        userId,
        skillId,
      })
    )[0];
    if (!result) {
      throw new NotFoundException({
        message: "[deleteUserSkill] - [deleteUserSkill] User skill not found",
        code: RESPONSE_CODE.USER_SKILL_NOT_FOUND,
      });
    }
    return {
      message: "User skill deleted successfully",
      code: RESPONSE_MESSAGE.SUCCESS,
      data: {
        skillId: result.skillId,
        organizationId: result.organizationId,
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
    const result = await this.cloudinaryService.uploadFile(file);
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
    await this.userOnboardingRepository.create(newOnboarding);
    await this.userRepository.update(
      { id: userId },
      {
        name: userOnboarding.name!,
        gender: userOnboarding.gender,
        dob: userOnboarding.dob,
      },
    );
    return {
      message: "User onboarding completed successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

  async getAllUsers(
    query: GetUserQuery,
  ): Promise<ApiResponse<PaginatedResultDto<GetAllUserResponseDto>>> {
    const result = await this.userRepository.getAllWithOffset(query);
    return {
      data: {
        data: result.data.map((user) => ({
          ...user,
          status: user.status as UserStatusEnum,
        })),
        pagination: result.pagination,
      },
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

    const updatedUser = {
      ...user,
      ...updateUserDto,
    };

    const updatedUserResult = await this.userRepository.update(
      { id: userId },
      updatedUser,
    );
    if (!updatedUserResult) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.USER_NOT_UPDATED,
        code: RESPONSE_CODE.USER_NOT_UPDATED,
      });
    }
    const rolesToUpdate = updateUserDto.roles || user.roles;

    for (const role of rolesToUpdate) {
      await this.casbinService.addRoleForUser(userId, role);
    }
    await this.casbinService.savePolicy();
    const userDto = GetUserResponseDto.from({
      ...updatedUser,
      provider: updatedUser.provider as ProviderEnum,
      onboardingCompleted: updatedUser.onboardingCompleted ?? undefined,
    });
    return {
      message: "User updated successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: userDto,
    };
  }
}
