import {
  Controller,
  Get,
  Param,
  UseGuards,
  Body,
  Query,
  Patch,
  Delete,
  Post,
} from "@nestjs/common";
import { UserUseCases } from "src/use-cases/user/user.use-case";
import {
  ApiOperation,
  ApiParam,
  ApiTags,
  ApiBody,
  ApiBearerAuth,
} from "@nestjs/swagger";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards/system-authorize.guard";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import {
  ApiResponse,
  ApiResponseDto,
  GetUserQueryDto,
  GetUserResponseDto,
  UserTrendsQueryDto,
  UserTrendsResponseDto,
  AdminSendEmailRequestDto,
  AdminSendEmailResponseDto,
  AdminEmailTemplateResponseDto,
  AdminUpdateUserRequestDto,
} from "@/interfaces/dtos";

@ApiTags("Admin Users")
@ApiBearerAuth()
@Controller("admin/users")
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
export class AdminUserController {
  constructor(private readonly userUseCases: UserUseCases) {}

  // @ApiOperation({ summary: "Get user by ID" })
  // @Get(":userId")
  // @ApiParam({ name: "userId", description: "User ID", example: "123" })
  // @ApiResponseDto(GetUserResponseDto)
  // async getUser(@Param("userId") userId: string) {
  //   return await this.userUseCases.getUserById(userId);
  // }

  @ApiOperation({ summary: "Get all users" })
  @Get()
  async getAllUsers(@Query() query: GetUserQueryDto) {
    return await this.userUseCases.getAllUsers(query);
  }

  @ApiOperation({ summary: "List admin bulk email templates" })
  @ApiResponseDto(AdminEmailTemplateResponseDto, { isArray: true })
  @Get("email-templates")
  getEmailTemplates(): ApiResponse<AdminEmailTemplateResponseDto[]> {
    return this.userUseCases.getAdminEmailTemplates();
  }

  @ApiOperation({ summary: "Queue bulk emails to selected users" })
  @ApiBody({ type: AdminSendEmailRequestDto })
  @ApiResponseDto(AdminSendEmailResponseDto)
  @Post("send-email")
  async sendEmail(
    @Body() body: AdminSendEmailRequestDto,
  ): Promise<ApiResponse<AdminSendEmailResponseDto>> {
    return await this.userUseCases.adminSendEmail(body);
  }

  @ApiOperation({ summary: "Update user" })
  @Patch(":userId")
  @ApiParam({ name: "userId", description: "User ID", example: "123" })
  @ApiBody({ type: AdminUpdateUserRequestDto })
  @ApiResponseDto(GetUserResponseDto)
  async adminUpdateUser(
    @Param("userId") userId: string,
    @Body() updateUserDto: AdminUpdateUserRequestDto,
  ) {
    return await this.userUseCases.adminUpdateUser(userId, updateUserDto);
  }

  @ApiOperation({ summary: "Delete user" })
  @Delete(":userId")
  @ApiParam({ name: "userId", description: "User ID", example: "123" })
  @ApiResponseDto(GetUserResponseDto)
  async deleteUser(@Param("userId") userId: string) {
    return await this.userUseCases.adminDeleteUser(userId);
  }

  @ApiOperation({
    summary: "Get user trends",
    description: "Get user registration trends over time",
  })
  @ApiResponseDto(UserTrendsResponseDto)
  @Get("trends")
  async getUserTrends(
    @Query() query: UserTrendsQueryDto,
  ): Promise<ApiResponse<UserTrendsResponseDto>> {
    return this.userUseCases.getUserTrends(query);
  }
}
