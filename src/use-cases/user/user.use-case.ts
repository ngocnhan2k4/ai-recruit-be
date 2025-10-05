import { Injectable, NotFoundException } from "@nestjs/common";
import { Company, Skill, User } from "../../core/entities";
import {
  IBloomFilterService,
  IUserRepository,
  IUserExperienceRepository,
  IUserSkillRepository,
} from "../../core/abstracts";
import { Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import {
  ApiResponse,
  GetUserResponseDto,
  UpdateUserRequestDto,
  UserDto,
  UserPublicResponseDto,
} from "@/interfaces/dtos";
import { CloudinaryService } from "@/frameworks/storage/cloudinary/cloudinary.service";
import { TokenPayload } from "@/common/types/token";
import { GenderEnum } from "@/common/constants/roles";
import { MultipartFile } from "@fastify/multipart";
import { UserExperience, UserSkill } from "@/core";
import {
  CreateUserExperienceRequestDto,
  UpdateUserExperienceRequestDto,
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
  }

  async getUserExperiences(userId: string): Promise<
    ApiResponse<
      {
        experience: UserExperience;
        company: Company;
        skill: Skill;
      }[]
    >
  > {
    const userExperiences =
      await this.userExperienceRepository.getUserExperiences(userId);
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
  ): Promise<ApiResponse<UserExperience>> {
    const result = await this.userExperienceRepository.create({
      ...createUserExperienceDto,
      userId,
      startDate: convertDateToStr(createUserExperienceDto.startDate),
      endDate: convertDateToStr(createUserExperienceDto.endDate),
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
      data: result,
    };
  }

  async updateUserExperience(
    userId: string,
    id: number,
    updateUserExperienceDto: UpdateUserExperienceRequestDto,
  ): Promise<ApiResponse<UserExperience>> {
    const userExperience = (
      await this.userExperienceRepository.getByField({
        userId,
        id,
      })
    )[0];
    if (!userExperience) {
      throw new NotFoundException({
        message: "[updateUserExperience] - [get] User experience not found",
        code: RESPONSE_CODE.USER_EXPERIENCE_NOT_FOUND,
      });
    }
    const updatedUserExperience = {
      ...userExperience,
      ...updateUserExperienceDto,
    };
    const result = (
      await this.userExperienceRepository.update(
        { userId, id },
        {
          ...updatedUserExperience,
          startDate: convertDateToStr(updateUserExperienceDto.startDate),
          endDate: convertDateToStr(updateUserExperienceDto.endDate),
        },
      )
    )[0];
    if (!result) {
      throw new NotFoundException({
        message:
          "[updateUserExperience] - [updateUserExperience] User experience not found",
        code: RESPONSE_CODE.USER_EXPERIENCE_NOT_FOUND,
      });
    }
    return {
      message: "User experience updated successfully",
      code: RESPONSE_MESSAGE.SUCCESS,
      data: result,
    };
  }

  async deleteUserExperience(
    userId: string,
    id: number,
  ): Promise<ApiResponse<UserExperience>> {
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
      data: result,
    };
  }

  async getUserSkills(userName: string): Promise<
    ApiResponse<
      {
        userId: string;
        skill: Skill;
      }[]
    >
  > {
    const userSkills = await this.userSkillRepository.getUserSkills(userName);
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
  ): Promise<ApiResponse<{ url: string; public_id: string; format: string }>> {
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
      avatarUrl: result.secure_url,
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
      message: "Avatar uploaded successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: {
        url: result.secure_url,
        public_id: result.public_id,
        format: result.format,
      },
    };
  }

  /**
   * Check if username exists using Bloom Filter (fast check)
   * Returns:
   * - false: Username definitely does NOT exist (100% accurate)
   * - true: Username MIGHT exist (needs database verification due to possible false positives)
   */
  async checkUserByUsername(
    username: string,
  ): Promise<ApiResponse<{ exists: boolean }>> {
    let exists = true;
    // Step 1: check bloom filter
    const mightExist = this.bloomFilterService.mightContain(username);

    if (!mightExist) {
      exists = false;
    }

    // Step 2: verify DB để loại false positive
    const user = await this.userRepository.getByField({ username });
    exists = user !== null;

    return {
      data: {
        exists,
      },
      message: "Username check result",
      code: RESPONSE_CODE.SUCCESS,
    };
  }
}
