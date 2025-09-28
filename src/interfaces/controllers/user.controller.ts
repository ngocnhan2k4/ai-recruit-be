import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Controller, Get, UseGuards, Param, Put, Body } from "@nestjs/common";
import { UserUseCases } from "src/use-cases/user/user.use-case";
import { JwtAuthGuard, CasbinGuard } from "@/frameworks/auth-services/guards";
import { CasbinPermission } from "@/frameworks/auth-services/casbin/casbin.decorator";
import {
  ApiResponse,
  ApiResponseDto,
} from "@/interfaces/dtos/common/api-response.dto";
import { UserPublicDto, UpdateUserDto, UserDto } from "../dtos";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { type TokenPayload } from "@/common/types/token";

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
  @ApiResponseDto(UserPublicDto)
  async getUserProfilePublic(
    @Param("username") username: string,
  ): Promise<ApiResponse<UserPublicDto>> {
    return await this.userUseCases.getUserByUsername(username);
  }

  @ApiOperation({ summary: "Get user profile" })
  @CasbinPermission("/", "GET")
  @Get("profile")
  @ApiResponseDto(UserDto)
  async getProfile(
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<UserDto>> {
    const userProfile = await this.userUseCases.getUserProfile(user.sub);
    return userProfile;
  }

  @ApiOperation({ summary: "Update user profile" })
  @CasbinPermission("/", "PUT")
  @Put("profile")
  async updateProfile(
    @GetUser() user: TokenPayload,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ApiResponse<UserDto>> {
    return await this.userUseCases.updateUserProfile(user.sub, updateUserDto);
  }
}
