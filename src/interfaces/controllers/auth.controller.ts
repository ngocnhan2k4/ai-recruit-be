import { Body, Controller, Post, HttpCode } from "@nestjs/common";
import { AuthUseCases } from "src/use-cases/auth/auth.use-case";
import {
  LoginDto,
  ApiResponse,
  RefreshTokenDto,
  TokenPairDto,
  MessageDto,
} from "../dtos";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiBadRequestResponse,
  ApiUnauthorizedResponse,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  getSchemaPath,
  ApiNotFoundResponse,
} from "@nestjs/swagger";

@ApiTags("Authentication")
@ApiExtraModels(
  ApiResponse,
  TokenPairDto,
  MessageDto,
  LoginDto,
  RefreshTokenDto,
)
@Controller("auth")
export class AuthController {
  constructor(private readonly authUseCases: AuthUseCases) {}

  @ApiOperation({
    summary: "User login",
    description:
      "Verify Firebase ID Token, auto-provision user if first login, issue access/refresh tokens.",
  })
  @ApiConsumes("application/json")
  @ApiBody({
    description: "Firebase ID Token",
    type: LoginDto,
    examples: {
      sample: {
        summary: "Login with Firebase ID Token",
        value: { idToken: "eyJhbGciOiJSUzI1NiIsImtpZCI6..." },
      },
    },
  })
  @ApiOkResponse({
    description: "Login success",
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponse) },
        {
          properties: {
            data: { $ref: getSchemaPath(TokenPairDto) },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: "Invalid request body",
    example: {
      statusCode: 400,
      message: ["idToken must be a string"],
      error: "Bad Request",
    },
  })
  @Post("login")
  async logIn(
    @Body() loginDto: LoginDto,
  ): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    return this.authUseCases.logIn(loginDto.idToken);
  }

  @ApiOperation({
    summary: "Refresh access token",
    description:
      "Validate refresh token and rotate it. Returns a new access token and a new refresh token.",
  })
  @ApiConsumes("application/json")
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
  @ApiOkResponse({
    description: "Refresh success",
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponse) },
        {
          properties: {
            data: { $ref: getSchemaPath(TokenPairDto) },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: "Invalid request body",
    example: {
      statusCode: 400,
      message: ["idToken must be a string"],
      error: "Bad Request",
    },
  })
  @ApiUnauthorizedResponse({
    description: "Invalid, revoked, or expired refresh token",
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponse) },
        {
          example: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid credentials.",
          },
        },
      ],
    },
  })
  @ApiNotFoundResponse({
    description: "User not found",
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponse) },
        {
          example: {
            code: "USER_NOT_FOUND",
            message: "User not found.",
          },
        },
      ],
    },
  })
  @Post("refresh")
  async refresh(
    @Body() body: RefreshTokenDto,
  ): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    return this.authUseCases.refreshToken(body.refreshToken);
  }

  @ApiOperation({
    summary: "Logout",
    description: "Revoke the provided refresh token.",
  })
  @ApiConsumes("application/json")
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
  @ApiOkResponse({
    description: "Logout success",
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponse) },
        {
          properties: {
            data: { $ref: getSchemaPath(MessageDto) },
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: "Invalid request body",
    example: {
      statusCode: 400,
      message: ["idToken must be a string"],
      error: "Bad Request",
    },
  })
  @ApiUnauthorizedResponse({
    description: "Invalid, revoked, or expired refresh token",
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponse) },
        {
          example: {
            code: "INVALID_CREDENTIALS",
            message: "Invalid credentials.",
          },
        },
      ],
    },
  })
  @ApiNotFoundResponse({
    description: "User not found",
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponse) },
        {
          example: {
            code: "USER_NOT_FOUND",
            message: "User not found.",
          },
        },
      ],
    },
  })
  @Post("logout")
  @HttpCode(200)
  async logout(
    @Body() body: RefreshTokenDto,
  ): Promise<ApiResponse<{ message: MessageDto }>> {
    return this.authUseCases.logout(body.refreshToken);
  }
}
