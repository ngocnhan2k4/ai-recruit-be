import { Injectable, NotFoundException } from "@nestjs/common";
import { User } from "../../core/entities";
import { IBloomFilterService, IDataServices } from "../../core/abstracts";
import { Logger, OnModuleInit } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import {
  ApiResponse,
  CreateUserExperienceDto,
  GetUserDto,
  UpdateUserDto,
  UpdateUserExperienceDto,
  UserDto,
  UserPublicDto,
} from "@/interfaces/dtos";
import { CloudinaryService } from "@/frameworks/storage/cloudinary/cloudinary.service";
import { TokenPayload } from "@/common/types/token";
import { GenderEnum } from "@/common/constants/roles";
import { MultipartFile } from "@fastify/multipart";
import { UserExperience, UserSkill } from "@/core/entities/user.entity";

@Injectable()
export class UserUseCases implements OnModuleInit {
  private readonly logger = new Logger(UserUseCases.name);

  constructor(
    private readonly dataServices: IDataServices,
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
      const users = await this.dataServices.users.getAll();
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
    return this.dataServices.users.getAll();
  }

  async getUserById(id: number): Promise<ApiResponse<GetUserDto>> {
    const user: User | null = await this.dataServices.users.get(id);
    if (!user) {
      throw new NotFoundException(
        new ApiResponse({
          message: RESPONSE_MESSAGE.USER_NOT_FOUND,
          code: RESPONSE_CODE.USER_NOT_FOUND,
        }),
      );
    }
    const userDto = GetUserDto.from(user);
    return new ApiResponse<GetUserDto>({
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: userDto,
    });
  }

  async getUserByAccessToken(
    payload: TokenPayload,
  ): Promise<ApiResponse<GetUserDto>> {
    const id: number = payload.sub;
    const user: User | null = await this.dataServices.users.get(id);
    if (!user) {
      throw new NotFoundException(
        new ApiResponse({
          message: RESPONSE_MESSAGE.USER_NOT_FOUND,
          code: RESPONSE_CODE.USER_NOT_FOUND,
        }),
      );
    }
    const userDto = GetUserDto.from(user);
    return new ApiResponse<GetUserDto>({
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: userDto,
    });
  }

  async getUserByUsername(
    username: string,
  ): Promise<ApiResponse<UserPublicDto>> {
    const user = await this.dataServices.users.getByField({ username });
    if (!user) {
      throw new NotFoundException({
        message: "User not found",
        code: RESPONSE_CODE.USER_NOT_FOUND,
      });
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
    userId: number,
    updateUserDto: UpdateUserDto,
  ): Promise<ApiResponse<UserDto>> {
    const user = await this.dataServices.users.get(userId);
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

    const result = await this.dataServices.users.update(userId, updatedUser);
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

  async getUserExperience(
    userId: number,
  ): Promise<ApiResponse<UserExperience[]>> {
    const userExperiences =
      await this.dataServices.userExperiences.getByUserId(userId);
    if (!userExperiences) {
      throw new NotFoundException({
        message:
          "[getUserExperience] - [getByUserId] User experience not found",
        code: RESPONSE_CODE.USER_EXPERIENCE_NOT_FOUND,
      });
    }
    return {
      message: "User experience fetched successfully",
      code: RESPONSE_MESSAGE.SUCCESS,
      data: userExperiences,
    };
  }

  async createUserExperience(
    createUserExperienceDto: CreateUserExperienceDto,
  ): Promise<ApiResponse<UserExperience>> {
    const userExperience = {
      ...createUserExperienceDto,
    };

    const result =
      await this.dataServices.userExperiences.create(userExperience);
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
    userId: number,
    id: string,
    updateUserExperienceDto: UpdateUserExperienceDto,
  ): Promise<ApiResponse<UserExperience>> {
    const userExperience = await this.dataServices.userExperiences.get(id);
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
    const result = await this.dataServices.userExperiences.updateUserExperience(
      userId,
      id,
      updatedUserExperience,
    );
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
    userId: number,
    id: string,
  ): Promise<ApiResponse<UserExperience>> {
    const result = await this.dataServices.userExperiences.deleteUserExperience(
      userId,
      id,
    );
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

  async getUserSkills(userId: number): Promise<ApiResponse<UserSkill[]>> {
    const userSkills = await this.dataServices.userSkills.getByUserId(userId);
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
    userId: number,
    skillId: string,
  ): Promise<ApiResponse<UserSkill>> {
    const userSkill = await this.dataServices.userSkills.createUserSkill(
      userId,
      skillId,
    );
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
    userId: number,
    skillId: string,
  ): Promise<ApiResponse<UserSkill>> {
    const result = await this.dataServices.userSkills.deleteUserSkill(
      userId,
      skillId,
    );
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

  async updateUserSkill(
    userId: number,
    skillId: string,
  ): Promise<ApiResponse<UserSkill>> {
    const userSkill = await this.dataServices.userSkills.updateUserSkill(
      userId,
      skillId,
    );
    if (!userSkill) {
      throw new NotFoundException({
        message: "[updateUserSkill] - [updateUserSkill] User skill not found",
        code: RESPONSE_CODE.USER_SKILL_NOT_FOUND,
      });
    }
    return {
      message: "User skill updated successfully",
      code: RESPONSE_MESSAGE.SUCCESS,
      data: userSkill,
    };
  }

  async uploadUserAvatar(
    userId: number,
    file: MultipartFile | undefined,
  ): Promise<ApiResponse<{ url: string; public_id: string; format: string }>> {
    if (!file) {
      throw new NotFoundException({
        message: "[uploadUserAvatar] - No file provided",
        code: RESPONSE_CODE.FILE_NOT_FOUND,
      });
    }
    const result = await this.cloudinaryService.uploadFile(file);
    const user = await this.dataServices.users.get(userId);
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
    const updatedUserResult = await this.dataServices.users.update(
      userId,
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
    const user = await this.dataServices.users.getByField({ username });
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
