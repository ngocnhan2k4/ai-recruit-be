import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { Controller, Get, UseGuards } from "@nestjs/common";
import { UserUseCases } from "src/use-cases/user/user.use-case";
import { JwtAuthGuard, CasbinGuard } from "@/frameworks/auth-services/guards";
import { CasbinPermission } from "@/frameworks/auth-services/casbin/casbin.decorator";

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
}
