import { Controller, Get, Param, Put, UseGuards, Body } from "@nestjs/common";
import { UserUseCases } from "src/use-cases/user/user.use-case";
import { ApiOperation, ApiParam, ApiTags, ApiBody } from "@nestjs/swagger";
import { CasbinGuard } from "@/frameworks/auth-services/guards/casbin.guard";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { GetUserResponseDto } from "@/interfaces/dtos/users/user.dto";
import { ApiResponseDto } from "@/interfaces/dtos/common/api-response.dto";
import { AdminUpdateUserRequestDto } from "@/interfaces/dtos/users/user.dto";

@ApiTags("Admin Users")
@Controller("admin/users")
export class AdminUserController {
  constructor(private readonly userUseCases: UserUseCases) {}

  @UseGuards(JwtAuthGuard, CasbinGuard)
  @ApiOperation({ summary: "Refresh bloom filter" })
  @Get(":userId")
  @ApiParam({ name: "userId", description: "User ID", example: "123" })
  @ApiResponseDto(GetUserResponseDto)
  async getUser(@Param("userId") userId: string) {
    return await this.userUseCases.getUserById(userId);
  }

  @UseGuards(JwtAuthGuard, CasbinGuard)
  @ApiOperation({ summary: "Update user" })
  @Put(":userId")
  @ApiParam({ name: "userId", description: "User ID", example: "123" })
  @ApiBody({ type: AdminUpdateUserRequestDto })
  @ApiResponseDto(GetUserResponseDto)
  async adminUpdateUser(
    @Param("userId") userId: string,
    @Body() updateUserDto: AdminUpdateUserRequestDto,
  ) {
    return await this.userUseCases.adminUpdateUser(userId, updateUserDto);
  }
}
