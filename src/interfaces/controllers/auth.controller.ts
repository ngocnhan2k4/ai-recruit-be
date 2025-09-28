import { Body, Controller, Post, HttpCode } from "@nestjs/common";
import { AuthUseCases } from "src/use-cases/auth/auth.use-case";
import {
  LoginDto,
  ApiResponse,
  RefreshTokenDto,
  TokenPairDto,
  LoginResponseDto,
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
} from "@nestjs/swagger";

@ApiTags("Authentication")
@ApiExtraModels(
  ApiResponse,
  TokenPairDto,
  LoginDto,
  RefreshTokenDto,
  LoginResponseDto,
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
            data: { $ref: getSchemaPath(LoginResponseDto) },
          },
        },
      ],
      example: {
        code: "SUCCESS",
        message: "Success",
        data: {
          tokens: {
            accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
            refreshToken: "f2f374604e2462c13f441457a68c2644ce...",
          },
          user: {
            id: 1,
            username: "exampleuser",
            email: "user@example.com",
            phone: "1234567890",
            avatarUrl: "https://cdn.example.com/avatar.png",
            name: "John Doe",
            dob: "1990-01-01",
            gender: "Male",
            firebaseUid: "lPuOOqhJlsc8J5Va7Jg2cYNMp323",
          },
        },
      },
    },
  })
  @ApiUnauthorizedResponse({
    description: "Invalid Firebase ID Token",
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
  @ApiBadRequestResponse({
    description: "Invalid request body",
    example: {
      code: 400,
      message: ["idToken must be a string"],
      stack: "...",
    },
  })
  @Post("login")
  @HttpCode(200)
  async logIn(
    @Body() loginDto: LoginDto,
  ): Promise<ApiResponse<LoginResponseDto>> {
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
      message: ["refreshToken must be a string"],
      stack: "...",
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
  @Post("refresh")
  @HttpCode(200)
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
          example: {
            code: "SUCCESS",
            message: "Logged out successfully.",
          },
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: "Invalid request body",
    example: {
      statusCode: 400,
      message: ["refreshToken must be a string"],
      stack: "...",
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
  @Post("logout")
  @HttpCode(200)
  async logout(@Body() body: RefreshTokenDto): Promise<ApiResponse<any>> {
    return this.authUseCases.logout(body.refreshToken);
  }
}
