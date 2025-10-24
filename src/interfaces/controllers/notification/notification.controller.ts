import { NotificationUseCase } from "@/use-cases/notification/notification.use-case";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
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
}
