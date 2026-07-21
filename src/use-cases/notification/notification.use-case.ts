import {
  getExplicitRequestLanguage,
  getFallbackLanguage,
  normalizeLanguageCode,
} from "@/common/utils";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { PaginatedResult } from "@/common/types";
import {
  ILearningRoadmapRepository,
  INotificationRepository,
  IOrganizationMemberInvitationRepository,
  IOrganizationRepository,
  ITaskRepository,
  IUserRepository,
} from "@/core";
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
import { NotificationRendererService } from "@/frameworks/notification/notification-renderer.service";

@Injectable()
export class NotificationUseCase {
  private readonly logger = new Logger(NotificationUseCase.name);

  constructor(
    private readonly notificationRepository: INotificationRepository,
    private readonly userRepository: IUserRepository,
    private readonly organizationRepository: IOrganizationRepository,
    private readonly organizationInvitationRepository: IOrganizationMemberInvitationRepository,
    private readonly taskRepository: ITaskRepository,
    private readonly learningRoadmapRepository: ILearningRoadmapRepository,
    private readonly notificationRenderer: NotificationRendererService,
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
          roadmap: d.roadmap
            ? {
                id: d.roadmap.id,
                generationStatus: d.roadmap.generationStatus,
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
    const enriched = await this.enrichNotifications(result);
    return this.buildGetNotificationsSuccessResponse(
      filter,
      await this.renderNotifications(filter.userId, enriched),
      false,
    );
  }

  async getNotificationsByAdmin(
    filter: NotificationFilter,
  ): Promise<ApiResponse<PaginatedResult<NotificationDto>>> {
    const adjustedFilter = this.getTypeFilters(filter, true);
    const result =
      await this.notificationRepository.getNotificationsByUser(adjustedFilter);
    const enriched = await this.enrichNotifications(result);
    return this.buildGetNotificationsSuccessResponse(
      filter,
      await this.renderNotifications(filter.userId, enriched),
      true,
    );
  }

  private async enrichNotifications(
    result: PaginatedResult<Notification>,
  ): Promise<PaginatedResult<Notification>> {
    if (result.data.length === 0) {
      return result;
    }

    const senderIds = this.uniqueIds(result.data.map((item) => item.senderId));
    const orgIds = this.uniqueIds(
      result.data.map((item) => item.payload?.orgId),
    );
    const orgInvitationIds = this.uniqueIds(
      result.data.map((item) => item.payload?.orgInvitationId),
    );
    const taskIds = this.uniqueIds(
      result.data.map((item) => item.payload?.taskId),
    );
    const roadmapIds = this.uniqueIds(
      result.data.map((item) => item.payload?.roadmapId),
    );

    const [senders, organizations, orgInvitations, tasks, roadmaps] =
      await Promise.all([
        this.userRepository.getByIds(senderIds, ["id", "name", "avatarUrl"]),
        this.organizationRepository.getByIds(orgIds, ["id", "name", "logoUrl"]),
        this.organizationInvitationRepository.getByIds(orgInvitationIds, [
          "id",
          "status",
        ]),
        this.taskRepository.getByIds(taskIds, [
          "id",
          "status",
          "type",
          "result",
        ]),
        this.learningRoadmapRepository.getByIds(roadmapIds, [
          "id",
          "generationStatus",
          "metadata",
        ]),
      ]);

    const senderMap = new Map(senders.map((row) => [row.id, row] as const));
    const organizationMap = new Map(
      organizations.map((row) => [row.id, row] as const),
    );
    const orgInvitationMap = new Map(
      orgInvitations.map((row) => [row.id, row] as const),
    );
    const taskMap = new Map(tasks.map((row) => [row.id, row] as const));
    const roadmapMap = new Map(roadmaps.map((row) => [row.id, row] as const));

    return {
      ...result,
      data: result.data.map((notification) => {
        const payload = notification.payload;
        const task = payload?.taskId ? taskMap.get(payload.taskId) : undefined;
        const roadmap = payload?.roadmapId
          ? roadmapMap.get(payload.roadmapId)
          : undefined;
        const organization = payload?.orgId
          ? organizationMap.get(payload.orgId)
          : undefined;
        const orgInvitation = payload?.orgInvitationId
          ? orgInvitationMap.get(payload.orgInvitationId)
          : undefined;
        const sender = notification.senderId
          ? senderMap.get(notification.senderId)
          : undefined;

        return {
          ...notification,
          sender: sender
            ? { name: sender.name, avatarUrl: sender.avatarUrl }
            : null,
          organization: organization
            ? { name: organization.name, logoUrl: organization.logoUrl }
            : null,
          orgInvitation: orgInvitation
            ? { status: String(orgInvitation.status ?? "") }
            : null,
          task: task
            ? {
                id: task.id,
                status: task.status,
                type: task.type,
                result: task.result,
              }
            : null,
          roadmap: roadmap
            ? {
                id: roadmap.id,
                generationStatus: roadmap.generationStatus,
                result: roadmap.metadata?.result ?? { roadmapId: roadmap.id },
                error: roadmap.metadata?.error ?? null,
              }
            : null,
        };
      }),
    };
  }

  private uniqueIds(values: Array<string | null | undefined>): string[] {
    return [
      ...new Set(
        values.filter((value): value is string => typeof value === "string"),
      ),
    ];
  }

  private async renderNotifications(
    userId: string,
    result: PaginatedResult<Notification>,
  ): Promise<PaginatedResult<Notification>> {
    const user = await this.userRepository.get(userId);
    const preferredLanguage = user?.preferredLanguage
      ? normalizeLanguageCode(user.preferredLanguage)
      : getFallbackLanguage();
    const requestLanguage = getExplicitRequestLanguage();

    return {
      ...result,
      data: result.data.map((notification) => {
        const rendered = this.notificationRenderer.render(notification, {
          languagePriority: requestLanguage
            ? [requestLanguage, preferredLanguage]
            : [preferredLanguage],
        });

        return {
          ...notification,
          title: rendered.title,
          message: rendered.message,
          displayLanguage: rendered.language,
        };
      }),
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
