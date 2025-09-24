import { Body, Controller, Post, HttpCode } from "@nestjs/common";
import { AuthUseCases } from "src/use-cases/auth/auth.use-case";
import { LoginDto, ApiResponse, RefreshTokenDto } from "../dtos";
import { ApiTags, ApiOperation } from "@nestjs/swagger";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authUseCases: AuthUseCases) {}

  @ApiOperation({ summary: "User login" })
  @Post("login")
  async logIn(
    @Body() loginDto: LoginDto,
  ): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    return this.authUseCases.logIn(loginDto.idToken);
  }

  @Post("refresh")
  async refresh(
    @Body() body: RefreshTokenDto,
  ): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    return this.authUseCases.refreshToken(body.refreshToken);
  }

  @Post("logout")
  @HttpCode(200)
  async logout(
    @Body() body: RefreshTokenDto,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.authUseCases.logout(body.refreshToken);
  }
}
