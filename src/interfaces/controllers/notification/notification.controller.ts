import { NotificationUseCase } from "@/use-cases/notification/notification.use-case";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
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
  NotificationActionRequestDto,
  NotificationActionResponseDto,
  UpdateNotificationStatusRequestDto,
  UpdateNotificationStatusResponseDto,
} from "@/interfaces/dtos";
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
    summary: "Update notification status",
    description: "Mark a notification as read or deleted (soft delete)",
  })
  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(UpdateNotificationStatusResponseDto)
  @Patch(":id")
  async updateNotificationStatus(
    @Param("id") notificationId: string,
    @Body() data: UpdateNotificationStatusRequestDto,
  ): Promise<ApiResponse<UpdateNotificationStatusResponseDto>> {
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
  async updateMultipleNotificationsStatus(
    @Body() data: NotificationActionRequestDto,
  ): Promise<ApiResponse<NotificationActionResponseDto>> {
    return this.notificationUseCase.updateMultipleNotificationsStatus(data);
  }
}
