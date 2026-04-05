import { GetUser } from "@/common/decorators";
import { type TokenPayload } from "@/common/types";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { SystemAuthorizeGuard } from "@/frameworks/auth-services/guards";
import {
  ApiResponse,
  ApiResponseDto,
  GetNotificationRequestDto,
  NotificationDto,
  PaginatedResultDecorator,
  PaginatedResultDto,
} from "@/interfaces/dtos";
import { NotificationUseCase } from "@/use-cases/notification/notification.use-case";
import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";

@ApiTags("Notification Admin")
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
@Controller("admin/notifications")
export class AdminNotificationController {
  constructor(private readonly notificationUseCase: NotificationUseCase) {}

  @ApiOperation({
    summary: "Get admin notifications by user id, org id",
    description: "Retrieve admin notifications (job_posted type only)",
  })
  @ApiResponseDto(PaginatedResultDecorator(NotificationDto))
  @Get()
  getNotificationsByAdmin(
    @Query() query: GetNotificationRequestDto,
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<PaginatedResultDto<NotificationDto>>> {
    return this.notificationUseCase.getNotificationsByAdmin({
      ...query,
      userId: user.userId,
    });
  }
}
