import { RESPONSE_CODE } from "@/common/constants/response";
import { PaginatedResult } from "@/common/types/api";
import { INotificationRepository } from "@/core";
import { NotificationFilter } from "@/core/entities/notification.entity";
import { ApiResponse } from "@/interfaces/dtos";
import { Injectable, Logger } from "@nestjs/common";
import {
  NotificationTypeEnum,
  NewNotification,
  NotificationStatusEnum,
} from "@/core/entities";
import {
  CreateNotificationResponseDto,
  GetNotificationResponseDto,
  NotificationActionRequestDto,
  NotificationActionResponseDto,
  UpdateNotificationStatusResponseDto,
} from "@/interfaces/dtos/notifications/notification.dto";
import { INotificationService } from "@/core/abstracts/notification.abstract";

@Injectable()
export class NotificationUseCase {
  private readonly logger = new Logger(NotificationUseCase.name);
  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly notificationService: INotificationService,
  ) {}

  async getNotificationsByUser(
    filter: NotificationFilter,
  ): Promise<ApiResponse<PaginatedResult<GetNotificationResponseDto>>> {
    const result =
      await this.notificationRepository.getNotificationsByUser(filter);
    this.logger.log(
      `Get notification of user: ${filter.userId}, orgId: ${filter.organizationId} successfully`,
    );
    return {
      code: RESPONSE_CODE.SUCCESS,
      data: {
        data: result.data.map((d) => ({
          notification: {
            ...d,
            type: d.type as NotificationTypeEnum,
          },
        })),
        pagination: result.pagination,
      },
      message: `Get notification of user: ${filter.userId}, orgId: ${filter.organizationId} successfully`,
    };
  }

  async createAndSendToUser(
    newNotification: NewNotification,
    recipient: { userId: string; organizationId?: string },
  ): Promise<ApiResponse<CreateNotificationResponseDto>> {
    const { userId, organizationId } = recipient;

    const [notification] =
      await this.notificationRepository.createNotificationWithRecipients(
        newNotification,
        [{ receiverId: userId, organizationId }],
      );

    this.logger.log(
      `Created notification "${newNotification.title}" for user: ${recipient.userId}`,
    );

    // Send via WebSocket
    const sent = this.notificationService.sendToUser(
      {
        userId: notification.receiverId,
        organizationId: notification.organizationId || undefined,
      },
      notification,
    );

    if (sent) {
      this.logger.log(
        `Notification created and sent to user ${notification.receiverId}, orgId ${notification.organizationId || "none"}: ${notification.title}`,
      );
    } else {
      this.logger.warn(
        `Notification created but user ${notification.receiverId}, orgId ${notification.organizationId || "none"} not connected for WebSocket delivery`,
      );
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      data: {
        notification: {
          ...notification,
          type: notification.type as NotificationTypeEnum,
        },
      },
      message: sent
        ? `Notification created and sent successfully`
        : `Notification created but WebSocket delivery failed`,
    };
  }

  async updateNotificationStatus(
    notificationId: string,
    status: NotificationStatusEnum,
  ): Promise<ApiResponse<UpdateNotificationStatusResponseDto>> {
    if (status === NotificationStatusEnum.READ) {
      await this.notificationRepository.markAsRead([notificationId]);
      this.logger.log(
        `Marked notification ${notificationId} as read successfully`,
      );
    } else if (status === NotificationStatusEnum.DELETED) {
      await this.notificationRepository.markAsDeleted([notificationId]);
      this.logger.log(
        `Marked notification ${notificationId} as deleted successfully`,
      );
    } else {
      throw new Error("Invalid status");
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      data: {
        notification: {
          id: notificationId,
          status,
        },
      },
      message: `Notification marked as ${status} successfully`,
    };
  }

  async updateMultipleNotificationsStatus(
    data: NotificationActionRequestDto,
  ): Promise<ApiResponse<NotificationActionResponseDto>> {
    if (!data.userNotificationIds || data.userNotificationIds.length === 0) {
      return {
        code: RESPONSE_CODE.SUCCESS,
        data: { count: 0 },
        message: "No notifications to update",
      };
    }

    if (data.status === NotificationStatusEnum.READ) {
      await this.notificationRepository.markAsRead(data.userNotificationIds);
      this.logger.log(
        `Marked ${data.userNotificationIds.length} notification(s) as read successfully`,
      );
    } else if (data.status === NotificationStatusEnum.DELETED) {
      await this.notificationRepository.markAsDeleted(data.userNotificationIds);
      this.logger.log(
        `Marked ${data.userNotificationIds.length} notification(s) as deleted successfully`,
      );
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      data: {
        count: data.userNotificationIds.length,
      },
      message: `Successfully marked ${data.userNotificationIds.length} notification(s) as ${data.status}`,
    };
  }
}
