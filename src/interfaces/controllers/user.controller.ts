import { ApiTags, ApiOperation } from "@nestjs/swagger";
import {
  Controller,
  Get,
  UseGuards,
  Request,
  Param,
  Put,
  Body,
} from "@nestjs/common";
import { UserUseCases } from "src/use-cases/user/user.use-case";
import { JwtAuthGuard, CasbinGuard } from "@/frameworks/auth-services/guards";
import { CasbinPermission } from "@/frameworks/auth-services/casbin/casbin.decorator";
import { ApiResponse } from "@/interfaces/dtos/api-response.dto";
import { UserPublicDto, UpdateUserDto } from "../dtos";
import { User } from "@/core/entities";
import { RESPONSE_CODE } from "@/common/constants/constants";

@ApiTags("Users")
@UseGuards(JwtAuthGuard, CasbinGuard)
@Controller("users")
export class UserController {
  constructor(private readonly userUseCases: UserUseCases) {}

  @ApiOperation({ summary: "Get all users" })
  @CasbinPermission("/", "GET")
  @Get()
  async getAll() {
    return this.userUseCases.getAllUsers();
  }

  @ApiOperation({ summary: "Get user by username" })
  @CasbinPermission("/", "GET")
  @Get(":username")
  async getUserProfilePublic(
    @Param("username") username: string,
  ): Promise<ApiResponse<UserPublicDto>> {
    return new ApiResponse<UserPublicDto>({
      message: "User profile fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: await this.userUseCases.getUserByUsername(username),
    });
  }

  @ApiOperation({ summary: "Get user profile" })
  @CasbinPermission("/", "GET")
  @Get("profile")
  async getProfile(@Request() req): Promise<ApiResponse<User>> {
    const userId = req?.user?.id;

    const userProfile = await this.userUseCases.getUserProfile(userId);
    return new ApiResponse<User>({
      message: "User profile fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: userProfile,
    });
  }

  @ApiOperation({ summary: "Update user profile" })
  @CasbinPermission("/", "PUT")
  @Put("profile")
  async updateProfile(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ApiResponse<User>> {
    const userId = req?.user?.id;
    return new ApiResponse<User>({
      message: "User profile updated successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: await this.userUseCases.updateUserProfile(userId, updateUserDto),
    });
  }
}
