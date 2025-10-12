import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiBearerAuth,
  ApiConsumes,
  ApiBody,
} from "@nestjs/swagger";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  UseGuards,
} from "@nestjs/common";
import { UserUseCases } from "src/use-cases/user/user.use-case";
import { JwtAuthGuard, CasbinGuard } from "@/frameworks/auth-services/guards";
import { CasbinPermission } from "@/frameworks/auth-services/casbin/casbin.decorator";
import {
  ApiResponse,
  ApiResponseDto,
  CheckUsernameResponseDto,
  GetUserResponseDto,
  UpdateUserRequestDto,
  UserAvatarUpdateRequestDto,
  UserDto,
  UserOnboardingStatusDto,
  UserPublicResponseDto,
  UserOnboardingDto,
} from "../dtos";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { type TokenPayload } from "@/common/types/token";
import {
  CreateUserExperienceRequestDto,
  UpdateUserExperienceRequestDto,
  UserExperiencesResponseDto,
} from "../dtos/users/user-experience.dto";
import {
  CreateUserSkillRequestDto,
  DeleteUserSkillResponseDto,
  UserSkillDto,
} from "../dtos/users/user-skill.dto";
import { GuestGuard } from "@/frameworks/auth-services/guards/guest.guard";
import { Skill } from "@/core/entities";
import { RESPONSE_CODE } from "@/common/constants/response";
import { UploadFileAndBody } from "@/common/decorators/upload-file.decorater";
import { type MultipartFile } from "@fastify/multipart";

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
  @ApiResponseDto(CheckUsernameResponseDto)
  async checkUsername(
    @Param("username") username: string,
  ): Promise<ApiResponse<CheckUsernameResponseDto>> {
    return await this.userUseCases.checkUserByUsername(username);
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

  @UseGuards(JwtAuthGuard)
  // @UseGuards(JwtAuthGuard, CasbinGuard)
  @ApiOperation({ summary: "Update user profile" })
  // @CasbinPermission("/", "PUT")
  @ApiBody({ type: UpdateUserRequestDto })
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

  @ApiOperation({ summary: "Get user experience" })
  @ApiResponseDto(UserExperiencesResponseDto, { isArray: true })
  @Get("user-experiences/:username")
  async getUserExperience(
    @Param("username") username: string,
  ): Promise<ApiResponse<UserExperiencesResponseDto[]>> {
    return this.userUseCases.getUserExperiences(username);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create user experience" })
  @CasbinPermission("/user-experiences", "POST")
  @Post("user-experiences")
  @ApiBody({ type: CreateUserExperienceRequestDto })
  @ApiResponseDto("number")
  async createUserExperience(
    @GetUser() user: TokenPayload,
    @Body() createUserExperienceDto: CreateUserExperienceRequestDto,
  ): Promise<ApiResponse<number>> {
    return this.userUseCases.createUserExperience(
      user.userId,
      createUserExperienceDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update user experience" })
  @CasbinPermission("/user-experiences", "PUT")
  @Put("user-experiences/:id")
  @ApiBody({ type: CreateUserExperienceRequestDto })
  @ApiResponseDto("number")
  async updateUserExperience(
    @GetUser() user: TokenPayload,
    @Param("id", ParseIntPipe) id: number,
    @Body() updateUserExperienceDto: CreateUserExperienceRequestDto,
  ): Promise<ApiResponse<number>> {
    return this.userUseCases.updateUserExperience(
      user.userId,
      id,
      updateUserExperienceDto,
    );
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Delete user experience" })
  @CasbinPermission("/user-experiences", "DELETE")
  @Delete("user-experiences/:id")
  @ApiResponseDto("number")
  async deleteUserExperience(
    @GetUser() user: TokenPayload,
    @Param("id", ParseIntPipe) id: number,
  ) {
    return this.userUseCases.deleteUserExperience(user.userId, id);
  }

  @ApiOperation({ summary: "Get user skills" })
  @CasbinPermission("/user-skills", "GET")
  @Get("user-skills")
  @ApiResponseDto(UserSkillDto, { isArray: true })
  async getUserSkills(
    @Param("userName") userName: string,
  ): Promise<ApiResponse<Skill[]>> {
    return this.userUseCases.getUserSkills(userName);
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create user skill" })
  @CasbinPermission("/user-skills", "POST")
  @Post("user-skills")
  @ApiBody({ type: CreateUserSkillRequestDto })
  @ApiResponseDto(UserSkillDto)
  async createUserSkill(
    @GetUser() user: TokenPayload,
    @Body() createUserSkillDto: CreateUserSkillRequestDto,
  ) {
    return this.userUseCases.createUserSkill(
      user.userId,
      createUserSkillDto.skillId,
      createUserSkillDto.companyId,
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
  ): Promise<ApiResponse<DeleteUserSkillResponseDto>> {
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

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Upload user avatar" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        type: { type: "string", enum: ["avatar", "banner"] },
      },
      required: ["file", "type"],
    },
  })
  @Post("avatar")
  async uploadUserAvatar(
    @GetUser() user: TokenPayload,
    @UploadFileAndBody()
    uploadFile: { file: MultipartFile; body: UserAvatarUpdateRequestDto },
  ) {
    if (!uploadFile)
      throw new BadRequestException({
        message: "No file uploaded",
        code: RESPONSE_CODE.BAD_REQUEST,
      });

    return this.userUseCases.uploadUserAvatar(
      user.userId,
      uploadFile.file,
      uploadFile.body.type,
    );
  }

  @UseGuards(JwtAuthGuard, CasbinGuard)
  @ApiOperation({ summary: "Get user onboarding status" })
  @CasbinPermission("/onboarding", "GET")
  @Get("onboarding")
  @ApiResponseDto(UserOnboardingStatusDto)
  async getUserOnboardingStatus(
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<UserOnboardingStatusDto>> {
    return this.userUseCases.checkUserEnterOnboarding(user.userId);
  }

  @UseGuards(JwtAuthGuard, CasbinGuard)
  @ApiOperation({ summary: "Complete user onboarding" })
  @CasbinPermission("/onboarding", "POST")
  @Post("onboarding")
  @ApiResponseDto(UserDto)
  async completeUserOnboarding(
    @GetUser() user: TokenPayload,
    @Body() userOnboardingDto: UserOnboardingDto,
  ): Promise<ApiResponse<void>> {
    return await this.userUseCases.completeUserOnboarding(
      userOnboardingDto,
      user.userId,
    );
  }
}
