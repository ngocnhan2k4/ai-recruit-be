import { Controller, Get } from "@nestjs/common";
import { ApiTags, ApiOperation } from "@nestjs/swagger";
import { UserUseCases } from "src/use-cases/user/user.use-case";

@ApiTags("Users")
@Controller("users")
export class UserController {
  constructor(private readonly userUseCases: UserUseCases) {}

  @ApiOperation({ summary: "Get all users" })
  @Get()
  async getAll() {
    return this.userUseCases.getAllUsers();
  }
}
