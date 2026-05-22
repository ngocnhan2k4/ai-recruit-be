import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { PaginatedResult } from "@/common/types";
import { INotificationRepository } from "@/core";
import { NotificationFilter } from "@/core/entities/notification.entity";
import { ApiResponse, NotificationDto } from "@/interfaces/dtos";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import {
  Notification,
  NotificationStatusEnum,
  NotificationType,
  TaskStatusEnum,
  TaskTypeEnum,
} from "@/core/entities";
import {
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
    const enrichTypes: string[] = [
      NotificationType.JOB_POSTED,
      NotificationType.JOB_UPDATED,
      NotificationType.FEEDBACK_ASSIGNED,
    ];

    if (isAdmin) {
      return { ...filter, includeTypes: enrichTypes, excludeTypes: undefined };
    }

    return { ...filter, excludeTypes: enrichTypes, includeTypes: undefined };
  }

  private buildGetNotificationsSuccessResponse(
    filter: NotificationFilter,
    result: PaginatedResult<Notification>,
    isAdmin: boolean,
  ): ApiResponse<PaginatedResult<NotificationDto>> {
    const actor = isAdmin ? "admin" : "user";
    this.logger.log(
      `Get notification of ${actor}: ${filter.userId}, orgId: ${filter.organizationId}, groupType: ${filter.groupType} successfully`,
    );

    return {
      code: RESPONSE_CODE.SUCCESS,
      data: {
        data: result.data.map((d) => ({
          ...d,
          type: d.type as NotificationType,
          task: d.task
            ? {
                ...d.task,
                type: d.task.type as TaskTypeEnum,
                status: d.task.status as TaskStatusEnum,
                result: d.task.result
                  ? // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    (({ data, ...rest }) => rest)(
                      d.task.result as Record<string, any>,
                    )
                  : null,
              }
            : null,
        })),
        pagination: result.pagination,
      },
      message: `Get notification of ${actor}: ${filter.userId}, orgId: ${filter.organizationId}, groupType: ${filter.groupType} successfully`,
    };
  }

  async getNotificationsByUser(
    filter: NotificationFilter,
  ): Promise<ApiResponse<PaginatedResult<NotificationDto>>> {
    const adjustedFilter = this.getTypeFilters(filter, false);
    const result =
      await this.notificationRepository.getNotificationsByUser(adjustedFilter);
    return this.buildGetNotificationsSuccessResponse(filter, result, false);
  }

  async getNotificationsByAdmin(
    filter: NotificationFilter,
  ): Promise<ApiResponse<PaginatedResult<NotificationDto>>> {
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
