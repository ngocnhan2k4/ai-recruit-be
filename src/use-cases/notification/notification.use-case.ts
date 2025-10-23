import { RESPONSE_CODE } from "@/common/constants/response";
import { GeneralQuery, PaginatedResult } from "@/common/types/api";
import { INotificationRepository } from "@/core";
import { NotificationFilter } from "@/core/entities/notification.entity";
import { ApiResponse } from "@/interfaces/dtos";
import { Injectable, Logger } from "@nestjs/common";
import { Notification, NotificationType } from "@/core/entities";
import { INotificationService } from "@/core/abstracts/notification.abstract";
import { NotificationDto } from "@/interfaces/dtos/notifications/notification.dto";

@Injectable()
export class NotificationUseCase {
  private readonly logger = new Logger(NotificationUseCase.name);
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly notificationService: INotificationService,
  ) {}

  async getNotificationsByUser(
    filter: NotificationFilter,
  ): Promise<ApiResponse<PaginatedResult<NotificationDto>>> {
    const result =
      await this.notificationRepository.getNotificationsByUser(filter);
    this.logger.log(
      `Get notification of user: ${filter.userId}, orgId: ${filter.organizationId} successfully`,
    );
    return {
      code: RESPONSE_CODE.SUCCESS,
      data: {
        data: result.data.map((d) => ({
          ...d,
          type: d.type as NotificationType,
        })),
        pagination: result.pagination,
      },
      message: `Get notification of user: ${filter.userId}, orgId: ${filter.organizationId} successfully`,
    };
  }

  // [TEST]: Only for testing purposes
  async createNotification() {
    const result = await this.notificationService.createAndSendToUser(
      {
        title: "Hello",
        message: "ngo nguyen duy nhan",
        type: "job_applied",
      },
      { userId: "7ac36333-075c-48ac-b62e-23d968eb69a1" },
    );
    return result;
  }
}
