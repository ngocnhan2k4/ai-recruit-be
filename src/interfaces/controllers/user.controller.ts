import { ApiTags, ApiOperation } from "@nestjs/swagger";
import {
  Controller,
  Get,
  UseGuards,
  Request,
  Param,
  Put,
  Body,
} from "@nestjs/common";
import { UserUseCases } from "src/use-cases/user/user.use-case";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { CasbinPermission } from "@/frameworks/auth-services/casbin/casbin.decorator";
import { UserPublicDto, UpdateUserDto, UserDto } from "../dtos";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { type TokenPayload } from "@/common/types/token";
import { ApiResponse, ApiResponseDto, GetUserDto } from "@/interfaces/dtos";
import {
  ApiOkResponse,
  ApiExtraModels,
  getSchemaPath,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";

@ApiTags("Users")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiExtraModels(ApiResponse, GetUserDto)
@Controller("users")
export class UserController {
  constructor(private readonly userUseCases: UserUseCases) {}

  // @ApiOperation({ summary: "Get all users" })
  // @CasbinPermission("/", "GET")
  // @Get()
  // async getAll() {
  //   return this.userUseCases.getAllUsers();
  // }

  // @ApiOperation({
  //   summary: "Get user by ID",
  //   description:
  //     "Retrieve detailed information about a user by their unique ID.",
  // })
  // @ApiOkResponse({
  //   description: "Retrieve user success",
  //   schema: {
  //     allOf: [
  //       { $ref: getSchemaPath(ApiResponse) },
  //       {
  //         properties: {
  //           data: { $ref: getSchemaPath(GetUserDto) },
  //         },
  //       },
  //     ],
  //     example: {
  //       code: "SUCCESS",
  //       message: "Success",
  //       data: {
  //         id: 1,
  //         username: "exampleuser",
  //         email: "user@example.com",
  //         phone: "1234567890",
  //         avatarUrl: "https://cdn.example.com/avatar.png",
  //         name: "John Doe",
  //         dob: "1990-01-01",
  //         gender: "Male",
  //         firebaseUid: "lPuOOqhJlsc8J5Va7Jg2cYNMp323",
  //       },
  //     },
  //   },
  // })
  // @ApiNotFoundResponse({
  //   description: "User not found",
  //   schema: {
  //     allOf: [
  //       { $ref: getSchemaPath(ApiResponse) },
  //       {
  //         example: {
  //           code: "USER_NOT_FOUND",
  //           message: "User not found.",
  //         },
  //       },
  //     ],
  //   },
  // })
  // @ApiUnauthorizedResponse({
  //   description: "Invalid or missing access token",
  //   schema: {
  //     allOf: [
  //       { $ref: getSchemaPath(ApiResponse) },
  //       {
  //         example: {
  //           code: 401,
  //           message: "Unauthorized",
  //           stack: "...",
  //         },
  //       },
  //     ],
  //   },
  // })
  // //@CasbinPermission("/:id", "GET")
  // @Get(":id")
  // async getById(@Param("id", ParseIntPipe) id: number) {
  //   return this.userUseCases.getUserById(id);
  // }

  @ApiOperation({
    summary: "Get current user",
    description: "Retrieve information about the currently authenticated user.",
  })
  @ApiOkResponse({
    description: "Retrieve user success",
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponse) },
        {
          properties: {
            data: { $ref: getSchemaPath(GetUserDto) },
          },
        },
      ],
      example: {
        code: "SUCCESS",
        message: "Success",
        data: {
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
  @ApiUnauthorizedResponse({
    description: "Invalid or missing access token",
    schema: {
      allOf: [
        { $ref: getSchemaPath(ApiResponse) },
        {
          example: {
            code: 401,
            message: "Unauthorized",
            stack: "...",
          },
        },
      ],
    },
  })
  @Get("me")
  getMe(@GetUser() user: TokenPayload): Promise<ApiResponse<GetUserDto>> {
    return this.userUseCases.getUserByAccessToken(user);
  }

  @ApiOperation({ summary: "Get user by username" })
  @CasbinPermission("/", "GET")
  @Get(":username")
  @ApiResponseDto(UserPublicDto)
  async getUserProfilePublic(
    @Param("username") username: string,
  ): Promise<ApiResponse<UserPublicDto>> {
    return await this.userUseCases.getUserByUsername(username);
  }

  @ApiOperation({ summary: "Update user profile" })
  @CasbinPermission("/", "PUT")
  @Put("profile")
  async updateProfile(
    @GetUser() user: TokenPayload,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ApiResponse<UserDto>> {
    return await this.userUseCases.updateUserProfile(user.sub, updateUserDto);
  }
}
