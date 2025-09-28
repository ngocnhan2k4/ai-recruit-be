import {
  Controller,
  Get,
  UseGuards,
  Request,
  Param,
  Put,
  Body,
  //ParseIntPipe,
  Req,
} from "@nestjs/common";
import { UserUseCases } from "src/use-cases/user/user.use-case";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { CasbinPermission } from "@/frameworks/auth-services/casbin/casbin.decorator";
import { ApiResponse, GetUserDto } from "@/interfaces/dtos";
import { FastifyRequest } from "fastify";
import { TokenPayload } from "@/common/types/token";
import {
  ApiTags,
  ApiOperation,
  ApiOkResponse,
  ApiExtraModels,
  getSchemaPath,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
} from "@nestjs/swagger";
import { UserPublicDto, UpdateUserDto } from "../dtos";
import { User } from "@/core/entities";
import { RESPONSE_CODE } from "@/common/constants/response";

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
  getMe(@Req() req: FastifyRequest & { user: TokenPayload }) {
    return this.userUseCases.getUserByAccessToken(req.user);
  }

  @ApiOperation({ summary: "Get user by username" })
  @CasbinPermission("/", "GET")
  @Get(":username")
  async getUserProfilePublic(
    @Param("username") username: string,
  ): Promise<ApiResponse<UserPublicDto>> {
    return new ApiResponse<UserPublicDto>({
      message: "User profile fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: await this.userUseCases.getUserByUsername(username),
    });
  }

  @ApiOperation({ summary: "Get user profile" })
  @CasbinPermission("/", "GET")
  @Get("profile")
  async getProfile(@Request() req): Promise<ApiResponse<User>> {
    const userId: number = req?.user?.id;

    const userProfile = await this.userUseCases.getUserProfile(userId);
    return new ApiResponse<User>({
      message: "User profile fetched successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: userProfile,
    });
  }

  @ApiOperation({ summary: "Update user profile" })
  @CasbinPermission("/", "PUT")
  @Put("profile")
  async updateProfile(
    @Request() req,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ApiResponse<User>> {
    const userId: number = req?.user?.id;
    return new ApiResponse<User>({
      message: "User profile updated successfully",
      code: RESPONSE_CODE.SUCCESS,
      data: await this.userUseCases.updateUserProfile(userId, updateUserDto),
    });
  }
}
