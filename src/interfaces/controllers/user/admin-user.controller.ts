import {
  Controller,
  Get,
  Param,
  UseGuards,
  Body,
  Query,
  Patch,
  Delete,
} from "@nestjs/common";
import { UserUseCases } from "src/use-cases/user/user.use-case";
import {
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiBody,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards/system-authorize.guard";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import {
  GetAllUserResponseDto,
  GetUserQueryDto,
  GetUserResponseDto,
} from "@/interfaces/dtos/users/user.dto";
import { ApiResponseDto } from "@/interfaces/dtos/common/api-response.dto";
import { AdminUpdateUserRequestDto } from "@/interfaces/dtos/users/user.dto";

@ApiTags("Admin Users")
@ApiBearerAuth()
@Controller("admin/users")
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
export class AdminUserController {
  constructor(private readonly userUseCases: UserUseCases) {}

  @ApiOperation({ summary: "Get user by ID" })
  @Get(":userId")
  @ApiParam({ name: "userId", description: "User ID", example: "123" })
  @ApiResponseDto(GetUserResponseDto)
  async getUser(@Param("userId") userId: string) {
    return await this.userUseCases.getUserById(userId);
  }

  @ApiOperation({ summary: "Get all users" })
  @Get()
  @ApiResponseDto(GetAllUserResponseDto)
  async getAllUsers(@Query() query: GetUserQueryDto) {
    return await this.userUseCases.getAllUsers(query);
  }

  @ApiOperation({ summary: "Update user" })
  @Patch(":userId")
  @ApiParam({ name: "userId", description: "User ID", example: "123" })
  @ApiBody({ type: AdminUpdateUserRequestDto })
  @ApiResponseDto(GetUserResponseDto)
  async adminUpdateUser(
    @Param("userId") userId: string,
    @Body() updateUserDto: AdminUpdateUserRequestDto,
  ) {
    return await this.userUseCases.adminUpdateUser(userId, updateUserDto);
  }

  @ApiOperation({ summary: "Delete user" })
  @Delete(":userId")
  @ApiParam({ name: "userId", description: "User ID", example: "123" })
  @ApiResponseDto(GetUserResponseDto)
  async deleteUser(@Param("userId") userId: string) {
    return await this.userUseCases.adminDeleteUser(userId);
  }
}
