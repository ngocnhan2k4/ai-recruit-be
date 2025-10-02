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
  GetUserResponseDto,
  UpdateUserRequestDto,
  UserDto,
  UserPublicResponseDto,
} from "../dtos";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { type TokenPayload } from "@/common/types/token";
import { type FastifyRequest } from "fastify";
import {
  CreateUserExperienceRequestDto,
  UpdateUserExperienceRequestDto,
  UserExperienceDto,
} from "../dtos/users/user-experience.dto";
import {
  CreateUserSkillRequestDto,
  UserSkillDto,
} from "../dtos/users/user-skill.dto";
import { GuestGuard } from "@/frameworks/auth-services/guards/guest.guard";

@ApiTags("Users")
@Controller("users")
export class UserController {
  constructor(private readonly userUseCases: UserUseCases) {}

  @UseGuards(JwtAuthGuard, CasbinGuard)
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

  @UseGuards(GuestGuard, CasbinGuard)
  @ApiOperation({
    summary: "Get current user",
    description: "Retrieve information about the currently authenticated user.",
  })
  @ApiResponseDto(GetUserResponseDto)
  @Get("me")
  getMe(
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<GetUserResponseDto>> {
    return this.userUseCases.getUserByAccessToken(user);
  }

  @UseGuards(JwtAuthGuard, CasbinGuard)
  @ApiOperation({ summary: "Get user by username" })
  @CasbinPermission("/", "GET")
  @Get(":username")
  @ApiResponseDto(UserPublicResponseDto)
  async getUserProfilePublic(
    @Param("username") username: string,
  ): Promise<ApiResponse<UserPublicResponseDto>> {
    return await this.userUseCases.getUserByUsername(username);
  }

  @UseGuards(JwtAuthGuard, CasbinGuard)
  @ApiOperation({ summary: "Update user profile" })
  @CasbinPermission("/", "PUT")
  @Put("profile")
  @ApiResponseDto(UserDto)
  async updateProfile(
    @GetUser() user: TokenPayload,
    @Body() updateUserDto: UpdateUserRequestDto,
  ): Promise<ApiResponse<UserDto>> {
    return await this.userUseCases.updateUserProfile(
      user.userId,
      updateUserDto,
    );
  }

  @UseGuards(JwtAuthGuard, CasbinGuard)
  @ApiOperation({ summary: "Get user experience" })
  @ApiResponseDto(UserExperienceDto, { isArray: true })
  @CasbinPermission("/user-experiences", "GET")
  @Get("user-experiences")
  async getUserExperience(
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<UserExperienceDto[]>> {
    return this.userUseCases.getUserExperiences(user.userId);
  }

  @UseGuards(JwtAuthGuard, CasbinGuard)
  @ApiOperation({ summary: "Create user experience" })
  @CasbinPermission("/user-experiences", "POST")
  @Post("user-experiences")
  @ApiResponseDto(UserExperienceDto)
  async createUserExperience(
    @GetUser() user: TokenPayload,
    @Body() createUserExperienceDto: CreateUserExperienceRequestDto,
  ): Promise<ApiResponse<UserExperienceDto>> {
    return this.userUseCases.createUserExperience(
      user.userId,
      createUserExperienceDto,
    );
  }

  @UseGuards(JwtAuthGuard, CasbinGuard)
  @ApiOperation({ summary: "Update user experience" })
  @CasbinPermission("/user-experiences", "PUT")
  @Put("user-experiences/:id")
  @ApiResponseDto(UserExperienceDto)
  async updateUserExperience(
    @GetUser() user: TokenPayload,
    @Param("id", ParseIntPipe) id: number,
    @Body() updateUserExperienceDto: UpdateUserExperienceRequestDto,
  ): Promise<ApiResponse<UserExperienceDto>> {
    return this.userUseCases.updateUserExperience(
      user.userId,
      id,
      updateUserExperienceDto,
    );
  }

  @UseGuards(JwtAuthGuard, CasbinGuard)
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

  @UseGuards(JwtAuthGuard, CasbinGuard)
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

  @UseGuards(JwtAuthGuard, CasbinGuard)
  @ApiOperation({ summary: "Create user skill" })
  @CasbinPermission("/user-skills", "POST")
  @Post("user-skills")
  @ApiResponseDto(UserSkillDto)
  async createUserSkill(
    @GetUser() user: TokenPayload,
    @Body() createUserSkillDto: CreateUserSkillRequestDto,
  ) {
    return this.userUseCases.createUserSkill(
      user.userId,
      createUserSkillDto.skillId,
    );
  }

  @UseGuards(JwtAuthGuard, CasbinGuard)
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

  @UseGuards(JwtAuthGuard, CasbinGuard)
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
