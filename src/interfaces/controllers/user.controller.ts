import { ApiTags, ApiOperation, ApiParam } from "@nestjs/swagger";
import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { UserUseCases } from "src/use-cases/user/user.use-case";
import { JwtAuthGuard, CasbinGuard } from "@/frameworks/auth-services/guards";
import { CasbinPermission } from "@/frameworks/auth-services/casbin/casbin.decorator";
import { ApiResponseDto } from "../dtos";

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

  @Get("check-username/:username")
  @ApiOperation({
    summary: "Check if username exists using Bloom Filter",
    description:
      "Fast username existence check using Bloom Filter. Returns false if definitely not exists, true if might exist (requires DB verification for accuracy).",
  })
  @ApiParam({
    name: "username",
    description: "Username to check",
    example: "john_doe",
  })
  @ApiResponseDto("string")
  async checkUsername(@Param("username") username: string) {
    const result = await this.userUseCases.checkUserByUsername(username);

    return result;
  }
}
