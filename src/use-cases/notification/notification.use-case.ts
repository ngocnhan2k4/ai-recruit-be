import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { PaginatedResult } from "@/common/types";
import { INotificationRepository } from "@/core";
import { NotificationFilter } from "@/core/entities/notification.entity";
import { ApiResponse } from "@/interfaces/dtos";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import {
  Notification,
  NotificationStatusEnum,
  NotificationType,
} from "@/core/entities";
import {
  GetNotificationResponseDto,
  NotificationActionRequestDto,
  NotificationActionResponseDto,
  UpdateNotificationStatusResponseDto,
} from "@/interfaces/dtos";

@Injectable()
export class NotificationUseCase {
  private readonly logger = new Logger(NotificationUseCase.name);

  constructor(
    private readonly notificationRepository: INotificationRepository,
  ) {}

  private getTypeFilters(filter: NotificationFilter, isAdmin: boolean) {
    const includeTypes: string[] = [];
    const excludeTypes: string[] = [];

    if (isAdmin) {
      includeTypes.push(NotificationType.JOB_POSTED);
      return { ...filter, includeTypes, excludeTypes: undefined };
    }

    excludeTypes.push(NotificationType.JOB_POSTED);
    return { ...filter, excludeTypes, includeTypes: undefined };
  }

  private buildGetNotificationsSuccessResponse(
    filter: NotificationFilter,
    result: PaginatedResult<Notification>,
    isAdmin: boolean,
  ): ApiResponse<PaginatedResult<GetNotificationResponseDto>> {
    const actor = isAdmin ? "admin" : "user";
    this.logger.log(
      `Get notification of ${actor}: ${filter.userId}, orgId: ${filter.organizationId}, groupType: ${filter.groupType} successfully`,
    );

    return {
      code: RESPONSE_CODE.SUCCESS,
      data: {
        data: result.data.map((d) => ({
          notification: {
            ...d,
            type: d.type as NotificationType,
          },
        })),
        pagination: result.pagination,
      },
      message: `Get notification of ${actor}: ${filter.userId}, orgId: ${filter.organizationId}, groupType: ${filter.groupType} successfully`,
    };
  }

  async getNotificationsByUser(
    filter: NotificationFilter,
  ): Promise<ApiResponse<PaginatedResult<GetNotificationResponseDto>>> {
    const adjustedFilter = this.getTypeFilters(filter, false);
    const result =
      await this.notificationRepository.getNotificationsByUser(adjustedFilter);
    return this.buildGetNotificationsSuccessResponse(filter, result, false);
  }

  async getNotificationsByAdmin(
    filter: NotificationFilter,
  ): Promise<ApiResponse<PaginatedResult<GetNotificationResponseDto>>> {
    const adjustedFilter = this.getTypeFilters(filter, true);
    const result =
      await this.notificationRepository.getNotificationsByUser(adjustedFilter);
    return this.buildGetNotificationsSuccessResponse(filter, result, true);
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
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.INVALID_NOTIFICATION_STATUS,
        code: RESPONSE_CODE.INVALID_NOTIFICATION_STATUS,
      });
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
