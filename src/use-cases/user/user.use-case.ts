import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Skill, User } from "../../core/entities";
import {
  IBloomFilterService,
  IUserRepository,
  IUserExperienceRepository,
  IUserSkillRepository,
  IUserOnboardingRepository,
} from "../../core/abstracts";
import { Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import {
  ApiResponse,
  GetUserResponseDto,
  TypeAvatar,
  UpdateUserRequestDto,
  UserDto,
  UserPublicResponseDto,
  UserOnboardingStatusDto,
  UserOnboardingDto,
} from "@/interfaces/dtos";
import { CloudinaryService } from "@/frameworks/storage/cloudinary/cloudinary.service";
import { TokenPayload } from "@/common/types/token";
import { GenderEnum } from "@/common/constants/roles";
import { MultipartFile } from "@fastify/multipart";
import { ICompanyRepository, UserSkill, UserOnboarding } from "@/core";
import {
  CreateUserExperienceRequestDto,
  UpdateUserExperienceRequestDto,
  UserExperiencesResponseDto,
} from "@/interfaces/dtos/users/user-experience.dto";
import { convertDateToStr } from "@/common/utils/date";

@Injectable()
export class UserUseCases implements OnModuleInit {
  private readonly logger = new Logger(UserUseCases.name);

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly userExperienceRepository: IUserExperienceRepository,
    private readonly userSkillRepository: IUserSkillRepository,
    public readonly bloomFilterService: IBloomFilterService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly companyRepository: ICompanyRepository,
    private readonly userOnboardingRepository: IUserOnboardingRepository,
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

  async getAllUsers(): Promise<User[]> {
    return this.userRepository.getAll();
  }

  async getUserById(id: number): Promise<ApiResponse<GetUserResponseDto>> {
    const user: User | null = await this.userRepository.get(id);
    if (!user) {
      throw new NotFoundException(
        new ApiResponse({
          message: RESPONSE_MESSAGE.USER_NOT_FOUND,
          code: RESPONSE_CODE.USER_NOT_FOUND,
        }),
      );
    }
    const userDto = GetUserResponseDto.from(user);
    return new ApiResponse<GetUserResponseDto>({
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: userDto,
    });
  }

  async getUserByAccessToken(
    payload: TokenPayload,
  ): Promise<ApiResponse<GetUserResponseDto>> {
    const id: string = payload.userId;
    const user: User | null = await this.userRepository.get(id);
    if (!user) {
      throw new NotFoundException(
        new ApiResponse({
          message: RESPONSE_MESSAGE.USER_NOT_FOUND,
          code: RESPONSE_CODE.USER_NOT_FOUND,
        }),
      );
    }
    const userDto = GetUserResponseDto.from(user);
    const userOnboarding = await this.userOnboardingRepository.getByField({
      userId: id,
    });
    const isOnboarded = userOnboarding.length > 0;
    userDto.onboardingCompleted = isOnboarded;
    console.log("userDto:", userDto);
    return new ApiResponse<GetUserResponseDto>({
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: userDto,
    });
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
      },
    };
  }

  async updateUserProfile(
    userId: string,
    updateUserDto: UpdateUserRequestDto,
  ): Promise<ApiResponse<UserDto>> {
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
        data: {
          ...result,
          gender: result.gender as GenderEnum,
        },
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
    return {
      message: "User experiences fetched successfully",
      code: RESPONSE_MESSAGE.SUCCESS,
      data: userExperiences,
    };
  }

  async createUserExperience(
    userId: string,
    createUserExperienceDto: CreateUserExperienceRequestDto,
  ): Promise<ApiResponse<number>> {
    let companyId = createUserExperienceDto.companyId;
    if (!companyId) {
      const company = await this.companyRepository.create({
        name: createUserExperienceDto.companyName,
      });
      companyId = company.id;
    }
    const result = await this.userExperienceRepository.create({
      ...createUserExperienceDto,
      userId,
      startDate: convertDateToStr(createUserExperienceDto.startDate),
      endDate: createUserExperienceDto.endDate
        ? convertDateToStr(createUserExperienceDto.endDate)
        : null,
    });
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
    updateUserExperienceDto: UpdateUserExperienceRequestDto,
  ): Promise<ApiResponse<number>> {
    const userExperience = (
      await this.userExperienceRepository.getByField({
        userId,
        id,
      })
    )[0];
    if (!userExperience) {
      this.logger.error(
        "[updateUserExperience] - [get] userExperience not found",
      );
      throw new NotFoundException({
        message: "[updateUserExperience] - [get] User experience not found",
        code: RESPONSE_CODE.USER_EXPERIENCE_NOT_FOUND,
      });
    }
    const updatedUserExperience = {
      ...userExperience,
      ...updateUserExperienceDto,
    };
    await this.userExperienceRepository.update(
      { userId, id },
      {
        ...updatedUserExperience,
        startDate: convertDateToStr(updateUserExperienceDto.startDate),
        endDate: convertDateToStr(updateUserExperienceDto.endDate),
      },
    );

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
    companyId: string,
  ): Promise<ApiResponse<UserSkill>> {
    const userSkill = await this.userSkillRepository.create({
      userId,
      skillId,
      companyId,
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
  ): Promise<ApiResponse<UserSkill>> {
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
      data: result,
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
  async checkUserEnterOnboarding(
    userId: string,
  ): Promise<ApiResponse<UserOnboardingStatusDto>> {
    const user = await this.userRepository.get(userId);
    if (!user) {
      throw new NotFoundException({
        message: "[checkUserEnterOnboarding] - User not found",
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
    }
    const userOnboarding = await this.userOnboardingRepository.getByField({
      userId,
    });
    console.log("User onboarding record:", userOnboarding);
    const isOnboarded = userOnboarding.length > 0;
    console.log("User onboarding status:", isOnboarded);
    return {
      data: {
        isOnboarded,
      },
      message: "User onboarding status checked successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }

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
    console.log(newOnboarding);
    await this.userOnboardingRepository.create(newOnboarding);
    return {
      message: "User onboarding completed successfully",
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
