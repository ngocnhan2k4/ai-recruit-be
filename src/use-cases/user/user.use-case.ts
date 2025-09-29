import { Injectable, NotFoundException } from "@nestjs/common";
import { User } from "../../core/entities";
import { IDataServices } from "../../core/abstracts";
import { UserFactoryService } from "./user-factory.service";
import { UserPublicDto, UpdateUserDto } from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { ApiResponse, GetUserDto } from "@/interfaces/dtos";
import { TokenPayload } from "@/common/types/token";

@Injectable()
export class UserUseCases {
  constructor(
    private readonly dataServices: IDataServices,
    private readonly userFactoryService: UserFactoryService,
  ) {}

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
        dob: user.dob,
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
