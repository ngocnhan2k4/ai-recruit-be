import { Environment } from "@/common/config";
import { REFRESH_TOKEN, RESPONSE_CODE } from "@/common/constants";
import {
  BadRequestException,
  Body,
  Controller,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { ApiBody, ApiOperation, ApiTags } from "@nestjs/swagger";
import { type FastifyReply, type FastifyRequest } from "fastify";
import { AuthUseCases } from "src/use-cases/auth/auth.use-case";
import {
  AccessTokenResponseDto,
  ApiResponse,
  ApiResponseDto,
  LoginRequestDto,
  LoginResponseDto,
} from "../../dtos";
@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(
    private readonly authUseCases: AuthUseCases,
    private readonly configService: ConfigService,
  ) {}

  @ApiOperation({
    summary: "User login",
    description:
      "Verify Firebase ID Token, auto-provision user if first login, issue access/refresh tokens.",
  })
  @ApiBody({
    description: "Firebase ID Token",
    type: LoginRequestDto,
  })
  @ApiResponseDto(LoginResponseDto)
  @Post("login")
  async logIn(
    @Body() loginDto: LoginRequestDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<ApiResponse<LoginResponseDto>> {
    const result = await this.authUseCases.logIn(loginDto.idToken);

    if (!result.data)
      throw new BadRequestException({
        code: RESPONSE_CODE.INVALID_CREDENTIALS,
        message: "Login failed",
      });

    const refreshExpiresInDays =
      this.configService.get<number>("REFRESH_EXPIRES_IN")!;
    const cookieMaxAge = loginDto.rememberMe
      ? refreshExpiresInDays * 24 * 60 * 60 // seconds
      : undefined; // session cookie

    res.cookie(REFRESH_TOKEN, result.data.tokens.refreshToken, {
      httpOnly: true,
      secure: !(this.configService.get("NODE_ENV") === Environment.Local), // Set to true in production with HTTPS
      sameSite:
        this.configService.get("NODE_ENV") === Environment.Local
          ? "lax"
          : "none", // Use "lax" for development, "none" for cross-origin in production
      path: "/",
      domain: undefined, // Let browser set automatically in dev
      ...(cookieMaxAge !== undefined && { maxAge: cookieMaxAge }),
    });

    return {
      code: result.code,
      message: result.message,
      data: {
        accessToken: result.data.tokens.accessToken,
        user: result.data.user,
      },
    };
  }

  @ApiOperation({
    summary: "Refresh access token",
    description:
      "Validate refresh token and rotate it. Returns a new access token and a new refresh token.",
  })
  @ApiResponseDto(AccessTokenResponseDto)
  @Post("refresh")
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<ApiResponse<AccessTokenResponseDto>> {
    const token = req.cookies[REFRESH_TOKEN];

    if (!token) {
      throw new BadRequestException({
        code: RESPONSE_CODE.TOKEN_NOT_FOUND,
        message: "Refresh token not provided",
      });
    }
    const result = await this.authUseCases.refreshToken(token);

    if (!result.data) return result;

    res.cookie(REFRESH_TOKEN, result.data.refreshToken, {
      httpOnly: true,
      secure: !(this.configService.get("NODE_ENV") === Environment.Local), // Set to true in production with HTTPS
      sameSite:
        this.configService.get("NODE_ENV") === Environment.Local
          ? "lax"
          : "none", // Use "lax" for development, "none" for cross-origin in production
      path: "/",
      domain: undefined, // Let browser set automatically
    });

    return {
      code: result.code,
      message: result.message,
      data: {
        accessToken: result.data.accessToken,
      },
    };
  }

  @ApiOperation({
    summary: "Logout",
    description: "Revoke the provided refresh token.",
  })
  @ApiResponseDto("string")
  @Post("logout")
  async logout(
    @Res({ passthrough: true }) res: FastifyReply,
    @Req() req: FastifyRequest,
  ): Promise<ApiResponse<any>> {
    const token = req.cookies[REFRESH_TOKEN];
    if (!token) {
      throw new BadRequestException({
        code: RESPONSE_CODE.TOKEN_NOT_FOUND,
        message: "Refresh token not provided",
      });
    }
    res.clearCookie(REFRESH_TOKEN, {
      httpOnly: true,
      secure: !(this.configService.get("NODE_ENV") === Environment.Local), // Must match the original cookie settings
      sameSite:
        this.configService.get("NODE_ENV") === Environment.Local
          ? "lax"
          : "none", // Must match the original cookie settings
      path: "/",
      domain: undefined, // Must match the original cookie settings
    });
    return this.authUseCases.logout(token);
  }
}
