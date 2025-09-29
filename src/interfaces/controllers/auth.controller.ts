import { Body, Controller, Post, HttpCode, Res, Req } from "@nestjs/common";
import { AuthUseCases } from "src/use-cases/auth/auth.use-case";
import {
  LoginDto,
  ApiResponse,
  RefreshTokenDto,
  LoginResponseDto,
  ApiResponseDto,
  AccessTokenDto,
} from "../dtos";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBody,
  getSchemaPath,
} from "@nestjs/swagger";
import { type FastifyRequest, type FastifyReply } from "fastify";
import { REFRESH_TOKEN } from "@/common/constants/token";
import { RESPONSE_CODE } from "@/common/constants/response";

@ApiTags("Authentication")
@Controller("auth")
export class AuthController {
  constructor(private readonly authUseCases: AuthUseCases) {}

  @ApiOperation({
    summary: "User login",
    description:
      "Verify Firebase ID Token, auto-provision user if first login, issue access/refresh tokens.",
  })
  @ApiBody({
    description: "Firebase ID Token",
    type: LoginDto,
  })
  @ApiResponseDto(LoginResponseDto)
  @Post("login")
  @HttpCode(200)
  async logIn(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<ApiResponse<LoginResponseDto>> {
    const result = await this.authUseCases.logIn(loginDto.idToken);

    if (!result.data) throw new Error("Login failed");

    res.cookie(REFRESH_TOKEN, result.data.tokens.refreshToken, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: "lax", // Use "lax" for development, "none" for cross-origin in production
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      domain: undefined, // Let browser set automatically
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
  @ApiBody({
    description: "Refresh token",
    type: RefreshTokenDto,
    examples: {
      sample: {
        summary: "Refresh with valid refresh token",
        value: { refreshToken: "f2f374604e2462c13f441457a68c2644ce..." },
      },
    },
  })
  @ApiResponseDto(AccessTokenDto)
  @Post("refresh")
  @HttpCode(200)
  async refresh(
    @Req() req: FastifyRequest,
    @Res({ passthrough: true }) res: FastifyReply,
  ): Promise<ApiResponse<AccessTokenDto>> {
    const token = req.cookies[REFRESH_TOKEN];
    if (!token) {
      return {
        message: "Refresh token not provided",
        code: RESPONSE_CODE.TOKEN_NOT_FOUND,
      };
    }
    const result = await this.authUseCases.refreshToken(token);

    if (!result.data) return result;

    res.cookie(REFRESH_TOKEN, result.data.refreshToken, {
      httpOnly: true,
      secure: false, // Set to true in production with HTTPS
      sameSite: "lax", // Use "lax" for development, "none" for cross-origin in production
      path: "/",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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
  @ApiBody({
    description: "Refresh token",
    type: RefreshTokenDto,
  })
  @ApiOkResponse({
    description: "Logout success",
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponse) },
        {
          example: {
            code: "SUCCESS",
            message: "Logged out successfully.",
          },
        },
      ],
    },
  })
  @Post("logout")
  @HttpCode(200)
  async logout(
    @Res({ passthrough: true }) res: FastifyReply,
    @Req() req: FastifyRequest,
  ): Promise<ApiResponse<any>> {
    const token = req.cookies[REFRESH_TOKEN];
    console.log("token", token);
    if (!token) {
      throw new Error("Refresh token not provided");
    }
    res.clearCookie(REFRESH_TOKEN, {
      httpOnly: true,
      secure: false, // Must match the original cookie settings
      sameSite: "lax", // Must match the original cookie settings
      path: "/",
      domain: undefined, // Must match the original cookie settings
    });
    return this.authUseCases.logout(token);
  }
}
