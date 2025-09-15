import { Controller, Get } from "@nestjs/common";
import { UserUseCases } from "src/use-cases/user/user.use-case";

@Controller("users")
export class UserController {
  constructor(private readonly userUseCases: UserUseCases) {}

  @Get()
  async getAll() {
    return this.userUseCases.getAllUsers();
  }
}
