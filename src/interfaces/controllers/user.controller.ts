import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse as SwaggerApiResponse,
} from "@nestjs/swagger";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Req,
  UseGuards,
} from "@nestjs/common";
import { UserUseCases } from "src/use-cases/user/user.use-case";
import { JwtAuthGuard, CasbinGuard } from "@/frameworks/auth-services/guards";
import { CasbinPermission } from "@/frameworks/auth-services/casbin/casbin.decorator";
import {
  ApiResponse,
  ApiResponseDto,
  GetUserDto,
  UpdateUserDto,
  UserDto,
  UserPublicDto,
} from "../dtos";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { type TokenPayload } from "@/common/types/token";
import { type FastifyRequest } from "fastify";
import {
  CreateUserExperienceDto,
  UpdateUserExperienceDto,
  UserExperienceDto,
} from "../dtos/users/user-experience.dto";
import { CreateUserSkillDto, UserSkillDto } from "../dtos/users/user-skill.dto";

@ApiTags("Users")
@UseGuards(JwtAuthGuard, CasbinGuard)
@Controller("users")
export class UserController {
  constructor(private readonly userUseCases: UserUseCases) {}

  @Get("check-username/:username")
  @ApiOperation({
    summary: "Check if username exists using Bloom Filter",
    description:
      "Fast username existence check using Bloom Filter. Returns false if definitely not exists, true if might exist (requires DB verification for accuracy).",
  })
  @ApiParam({
    name: "username",
    description: "Username to check",
    example: "john_doe",
  })
  @ApiResponseDto("string")
  async checkUsername(@Param("username") username: string) {
    const result = await this.userUseCases.checkUserByUsername(username);

    return result;
  }

  @ApiOperation({
    summary: "Get current user",
    description: "Retrieve information about the currently authenticated user.",
  })
  @ApiResponseDto(GetUserDto)
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
    return await this.userUseCases.updateUserProfile(
      user.userId,
      updateUserDto,
    );
  }

  @ApiOperation({ summary: "Get user experience" })
  @ApiResponseDto(UserExperienceDto, { isArray: true })
  @CasbinPermission("/user-experiences", "GET")
  @Get("user-experiences")
  async getUserExperience(
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<UserExperienceDto[]>> {
    return this.userUseCases.getUserExperiences(user.userId);
  }

  @ApiOperation({ summary: "Create user experience" })
  @CasbinPermission("/user-experiences", "POST")
  @Post("user-experiences")
  @ApiResponseDto(UserExperienceDto)
  async createUserExperience(
    @GetUser() user: TokenPayload,
    @Body() createUserExperienceDto: CreateUserExperienceDto,
  ): Promise<ApiResponse<UserExperienceDto>> {
    return this.userUseCases.createUserExperience(
      user.userId,
      createUserExperienceDto,
    );
  }

  @ApiOperation({ summary: "Update user experience" })
  @CasbinPermission("/user-experiences", "PUT")
  @Put("user-experiences/:id")
  @ApiResponseDto(UserExperienceDto)
  async updateUserExperience(
    @GetUser() user: TokenPayload,
    @Param("id", ParseIntPipe) id: number,
    @Body() updateUserExperienceDto: UpdateUserExperienceDto,
  ): Promise<ApiResponse<UserExperienceDto>> {
    return this.userUseCases.updateUserExperience(
      user.userId,
      id,
      updateUserExperienceDto,
    );
  }

  @ApiOperation({ summary: "Delete user experience" })
  @SwaggerApiResponse({
    status: 200,
    description: "User experience deleted successfully",
  })
  @CasbinPermission("/user-experiences", "DELETE")
  @Delete("user-experiences/:id")
  @ApiResponseDto(UserDto)
  async deleteUserExperience(
    @GetUser() user: TokenPayload,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.userUseCases.deleteUserExperience(user.userId, id);
  }

  @ApiOperation({ summary: "Get user skills" })
  @SwaggerApiResponse({
    status: 200,
    description: "User skills fetched successfully",
  })
  @CasbinPermission("/user-skills", "GET")
  @Get("user-skills")
  @ApiResponseDto(UserSkillDto, { isArray: true })
  async getUserSkills(
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<UserSkillDto[]>> {
    return this.userUseCases.getUserSkills(user.userId);
  }

  @ApiOperation({ summary: "Create user skill" })
  @CasbinPermission("/user-skills", "POST")
  @Post("user-skills")
  @ApiResponseDto(UserSkillDto)
  async createUserSkill(
    @GetUser() user: TokenPayload,
    @Body() createUserSkillDto: CreateUserSkillDto,
  ) {
    return this.userUseCases.createUserSkill(
      user.userId,
      createUserSkillDto.skillId,
    );
  }

  @ApiOperation({ summary: "Delete user skill" })
  @CasbinPermission("/user-skills", "DELETE")
  @Delete("user-skills/:id")
  @ApiResponseDto(UserSkillDto)
  async deleteUserSkill(
    @GetUser() user: TokenPayload,
    @Param("id") id: string,
  ) {
    return this.userUseCases.deleteUserSkill(user.userId, id);
  }

  // @ApiOperation({ summary: "Update user skill" })
  // @CasbinPermission("/user-skills", "PUT")
  // @Put("user-skills")
  // @ApiResponseDto(UserSkillDto)
  // async updateUserSkill(
  //   @GetUser() user: TokenPayload,
  //   @Body() updateUserSkillDto: UpdateUserSkillDto,
  // ): Promise<ApiResponse<UserSkillDto>> {
  //   return await this.userUseCases.updateUserSkill(
  //     user.sub,
  //     updateUserSkillDto.skillId,
  //   );
  // }

  @ApiOperation({ summary: "Upload user avatar" })
  @CasbinPermission("/user-avatar", "POST")
  @Post("user-avatar")
  @ApiResponseDto(UserDto)
  async uploadUserAvatar(
    @GetUser() user: TokenPayload,
    @Req() req: FastifyRequest,
  ) {
    const file = await req.file();

    return this.userUseCases.uploadUserAvatar(user.userId, file);
  }
}
