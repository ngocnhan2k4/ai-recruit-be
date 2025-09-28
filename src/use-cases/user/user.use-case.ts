import { Injectable, NotFoundException } from "@nestjs/common";
import { User } from "../../core/entities";
import { IDataServices } from "../../core/abstracts";
import { UserFactoryService } from "./user-factory.service";
import { UserPublicDto, UpdateUserDto, ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_MESSAGE } from "@/common/constants/response";

@Injectable()
export class UserUseCases {
  constructor(
    private readonly dataServices: IDataServices,
    private readonly userFactoryService: UserFactoryService,
  ) {}

  async getAllUsers(): Promise<User[]> {
    return this.dataServices.users.getAll();
  }

  async getUserProfile(userId: number): Promise<ApiResponse<User>> {
    const user = await this.dataServices.users.get(userId);
    if (!user) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.USER_NOT_FOUND,
        code: RESPONSE_MESSAGE.USER_NOT_FOUND,
      });
    }

    return {
      message: "User profile fetched successfully",
      code: RESPONSE_MESSAGE.SUCCESS,
      data: user,
    };
  }

  async getUserByUsername(
    username: string,
  ): Promise<ApiResponse<UserPublicDto>> {
    const user = await this.dataServices.users.getByField({ username });
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
        gender: user.gender,
      },
    };
  }

  async updateUserProfile(
    userId: number,
    updateUserDto: UpdateUserDto,
  ): Promise<ApiResponse<User>> {
    const user = await this.dataServices.users.get(userId);
    if (!user) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.USER_NOT_FOUND,
        code: RESPONSE_MESSAGE.USER_NOT_FOUND,
      });
    }

    const updatedUser = this.userFactoryService.updateUser(user, updateUserDto);
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
      data: result,
    };
  }
}
