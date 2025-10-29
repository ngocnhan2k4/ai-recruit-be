import { NotificationUseCase } from "@/use-cases/notification/notification.use-case";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  UseGuards,
  Patch,
  Param,
} from "@nestjs/common";
import {
  ApiResponse,
  ApiResponseDto,
  PaginatedResultDto,
  PaginatedResultDecorator,
} from "@/interfaces/dtos";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { type TokenPayload } from "@/common/types/token";
import {
  GetNotificationRequestDto,
  GetNotificationResponseDto,
  CreateNotificationRequestDto,
  CreateNotificationResponseDto,
  UpdateNotificationStatusDto,
  NotificationActionRequestDto,
  NotificationActionResponseDto,
} from "@/interfaces/dtos/notifications/notification.dto";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";

@ApiTags("Notification")
@Controller("notifications")
export class NotificationController {
  constructor(private readonly notificationUseCase: NotificationUseCase) {}

  @ApiOperation({
    summary: "Get notification by user id, org id",
  })
  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(PaginatedResultDecorator(GetNotificationResponseDto))
  @Get()
  async getNotificationsByUser(
    @Query() query: GetNotificationRequestDto,
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<PaginatedResultDto<GetNotificationResponseDto>>> {
    return this.notificationUseCase.getNotificationsByUser({
      ...query,
      userId: user.userId,
    });
  }

  @ApiOperation({
    summary: "Create and send notification to user",
  })
  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(CreateNotificationResponseDto)
  @Post()
  async createAndSendToUser(
    @Body() data: CreateNotificationRequestDto,
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<{ notification: any }>> {
    return this.notificationUseCase.createAndSendToUser(
      {
        ...data,
        senderId: data.senderId || user.userId,
      },
      data.recipients[0],
    );
  }

  @ApiOperation({
    summary: "Update notification status",
    description: "Mark a notification as read or deleted (soft delete)",
  })
  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(CreateNotificationResponseDto)
  @Patch(":id")
  async updateNotificationStatus(
    @Param("id") notificationId: string,
    @Body() data: UpdateNotificationStatusDto,
  ): Promise<ApiResponse<{ notification: any }>> {
    return this.notificationUseCase.updateNotificationStatus(
      notificationId,
      data.status,
    );
  }

  @ApiOperation({
    summary: "Update multiple notifications status",
    description:
      "Mark multiple notifications as read or deleted in a single operation. Use query param ?status=read or ?status=deleted",
  })
  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(NotificationActionResponseDto)
  @Patch()
  async updateNotificationsStatus(
    @Query("status") status: "read" | "deleted",
    @Body() data: NotificationActionRequestDto,
  ): Promise<ApiResponse<{ count: number }>> {
    return this.notificationUseCase.updateNotificationsStatus(
      data.userNotificationIds,
      status,
    );
  }
}
