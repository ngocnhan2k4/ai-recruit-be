import {
  Controller,
  Get,
  UseGuards,
  Param,
  Put,
  Body,
  Post,
  Delete,
  UploadedFile,
} from "@nestjs/common";
import { UserUseCases } from "src/use-cases/user/user.use-case";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { CasbinPermission } from "@/frameworks/auth-services/casbin/casbin.decorator";
import {
  UserPublicDto,
  UpdateUserDto,
  CreateUserExperienceDto,
  UpdateUserExperienceDto,
  UserDto,
  CreateUserSkillDto,
  UpdateUserSkillDto,
} from "../dtos";
import { UserExperience, UserSkill } from "@/core/entities";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { type TokenPayload } from "@/common/types/token";
import { ApiResponse, ApiResponseDto, GetUserDto } from "@/interfaces/dtos";
import {
  ApiOkResponse,
  ApiExtraModels,
  getSchemaPath,
  ApiNotFoundResponse,
  ApiUnauthorizedResponse,
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse as SwaggerApiResponse,
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
  @ApiResponseDto(UserDto)
  async updateProfile(
    @GetUser() user: TokenPayload,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<ApiResponse<UserDto>> {
    return await this.userUseCases.updateUserProfile(user.sub, updateUserDto);
  }

  @ApiOperation({ summary: "Get user experience" })
  @SwaggerApiResponse({
    status: 200,
    description: "User experience fetched successfully",
  })
  @ApiBearerAuth()
  @CasbinPermission("/user-experiences", "GET")
  @Get("user-experiences")
  async getUserExperience(@GetUser() user: TokenPayload) {
    const userId = user.sub;
    return this.userUseCases.getUserExperience(userId);
  }

  @ApiOperation({ summary: "Create user experience" })
  @SwaggerApiResponse({
    status: 200,
    description: "User experience created successfully",
  })
  @ApiBearerAuth()
  @CasbinPermission("/user-experiences", "POST")
  @Post("user-experiences")
  @ApiResponseDto(UserExperience)
  async createUserExperience(
    @GetUser() user: TokenPayload,
    @Body() createUserExperienceDto: CreateUserExperienceDto,
  ) {
    const userId = user.sub;
    createUserExperienceDto.userId = userId;
    return this.userUseCases.createUserExperience(createUserExperienceDto);
  }

  @ApiOperation({ summary: "Update user experience" })
  @SwaggerApiResponse({
    status: 200,
    description: "User experience updated successfully",
  })
  @ApiBearerAuth()
  @CasbinPermission("/user-experiences", "PUT")
  @Put("user-experiences/:id")
  @ApiResponseDto(UserDto)
  async updateUserExperience(
    @GetUser() user: TokenPayload,
    @Param("id") id: string,
    @Body() updateUserExperienceDto: UpdateUserExperienceDto,
  ) {
    const userId = user.sub;
    return this.userUseCases.updateUserExperience(
      userId,
      id,
      updateUserExperienceDto,
    );
  }

  @ApiOperation({ summary: "Delete user experience" })
  @SwaggerApiResponse({
    status: 200,
    description: "User experience deleted successfully",
  })
  @ApiBearerAuth()
  @CasbinPermission("/user-experiences", "DELETE")
  @Delete("user-experiences/:id")
  @ApiResponseDto(UserDto)
  async deleteUserExperience(
    @GetUser() user: TokenPayload,
    @Param("id") id: string,
  ) {
    const userId = user.sub;
    return this.userUseCases.deleteUserExperience(userId, id);
  }

  @ApiOperation({ summary: "Get user skills" })
  @SwaggerApiResponse({
    status: 200,
    description: "User skills fetched successfully",
  })
  @ApiBearerAuth()
  @CasbinPermission("/user-skills", "GET")
  @Get("user-skills")
  @ApiResponseDto(UserSkill)
  async getUserSkills(@GetUser() user: TokenPayload) {
    const userId = user.sub;
    return this.userUseCases.getUserSkills(userId);
  }

  @ApiOperation({ summary: "Create user skill" })
  @SwaggerApiResponse({
    status: 200,
    description: "User skill created successfully",
  })
  @ApiBearerAuth()
  @CasbinPermission("/user-skills", "POST")
  @Post("user-skills")
  @ApiResponseDto(UserSkill)
  async createUserSkill(
    @GetUser() user: TokenPayload,
    @Body() createUserSkillDto: CreateUserSkillDto,
  ) {
    const userId = user.sub;
    return this.userUseCases.createUserSkill(
      userId,
      createUserSkillDto.skillId,
    );
  }

  @ApiOperation({ summary: "Delete user skill" })
  @SwaggerApiResponse({
    status: 200,
    description: "User skill deleted successfully",
  })
  @ApiBearerAuth()
  @CasbinPermission("/user-skills", "DELETE")
  @Delete("user-skills/:id")
  @ApiResponseDto(UserSkill)
  async deleteUserSkill(
    @GetUser() user: TokenPayload,
    @Param("id") id: string,
  ) {
    const userId = user.sub;
    return this.userUseCases.deleteUserSkill(userId, id);
  }

  @ApiOperation({ summary: "Update user skill" })
  @SwaggerApiResponse({
    status: 200,
    description: "User skill updated successfully",
  })
  @ApiBearerAuth()
  @CasbinPermission("/user-skills", "PUT")
  @Put("user-skills")
  @ApiResponseDto(UserSkill)
  async updateUserSkill(
    @GetUser() user: TokenPayload,
    @Body() updateUserSkillDto: UpdateUserSkillDto,
  ) {
    const userId = user.sub;
    return this.userUseCases.updateUserSkill(
      userId,
      updateUserSkillDto.skillId,
    );
  }

  @ApiOperation({ summary: "Upload user avatar" })
  @SwaggerApiResponse({
    status: 200,
    description: "User avatar uploaded successfully",
  })
  @ApiBearerAuth()
  @CasbinPermission("/user-avatar", "POST")
  @Post("user-avatar")
  @ApiResponseDto(UserDto)
  async uploadUserAvatar(
    @GetUser() user: TokenPayload,
    @UploadedFile() file: Express.Multer.File,
  ) {
    const userId = user.sub;
    return this.userUseCases.uploadUserAvatar(userId, file);
  }
}
