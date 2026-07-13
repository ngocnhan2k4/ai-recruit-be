import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import {
  EmailJobType,
  FeedbackStatusEnum,
  FeedbackTypeEnum,
  IFeedbackRepository,
  IUserRepository,
  NewFeedback,
  NotificationType,
  IMessageQueueService,
  FeedbackAssignedEmailData,
  FeedbackResolvedEmailData,
} from "@/core";
import { INotificationService } from "@/core/abstracts/notification.abstract";
import { FeedbackFilter } from "@/core/entities/feedback.entity";
import {
  ApiResponse,
  FeedbackTrendsResponseDto,
  FeedbackTrendsQueryDto,
} from "@/interfaces/dtos";
import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import {
  CreateFeedbackRequestDto,
  CreateFeedbackResponseDto,
  GetFeedbacksResponseDto,
  UpdateFeedbackRequestDto,
} from "@/interfaces/dtos";
import { PaginatedResult } from "@/common/types";
import { getRequestLanguage } from "@/common/utils";

@Injectable()
export class FeedbackUseCase {
  private readonly logger = new Logger(FeedbackUseCase.name);

  constructor(
    private readonly feedbackRepository: IFeedbackRepository,
    private readonly userRepository: IUserRepository,
    private readonly notificationService: INotificationService,
    private readonly messageQueueService: IMessageQueueService,
  ) {}

  async createFeedback(
    data: CreateFeedbackRequestDto,
    userId?: string,
  ): Promise<ApiResponse<CreateFeedbackResponseDto>> {
    const user = userId ? await this.userRepository.get(userId) : null;

    const newFeedback: NewFeedback = {
      type: data.type ?? FeedbackTypeEnum.FEEDBACK,
      name: data.name || user?.name || "Anonymous",
      email: data.email || user?.email || null,
      subject: data.subject,
      message: data.message,
      languageCode: getRequestLanguage(),
      images: data.images,
      metadata: data.metadata ?? null,
      userId,
    };

    const created = await this.feedbackRepository.create(newFeedback);

    this.logger.log(`Feedback created successfully: ${created.id}`);

    return {
      code: RESPONSE_CODE.SUCCESS,
      data: {
        feedback: {
          ...created,
          type: created.type as FeedbackTypeEnum,
          status: created.status as FeedbackStatusEnum,
        },
      },
      message: "Feedback submitted successfully",
    };
  }

  async getSubmittedSurveyKeys(
    userId: string,
    surveyKeys?: string[],
  ): Promise<ApiResponse<{ surveyKeys: string[] }>> {
    const keys = await this.feedbackRepository.findSubmittedSurveyKeys(
      userId,
      surveyKeys,
    );

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: { surveyKeys: keys },
    };
  }

  async getFeedbacks(
    filter: FeedbackFilter,
  ): Promise<ApiResponse<PaginatedResult<GetFeedbacksResponseDto>>> {
    const lang = getRequestLanguage();
    const result = await this.feedbackRepository.getFeedbacks(filter);

    this.logger.log(`Retrieved ${result.data.length} feedbacks`);

    return {
      code: RESPONSE_CODE.SUCCESS,
      data: {
        data: result.data.map((feedback) => ({
          ...feedback,
          canTranslate: feedback.languageCode !== lang,
          type: feedback.type as FeedbackTypeEnum,
          status: feedback.status as FeedbackStatusEnum,
          assignedToUserId: feedback.assignedToUserId ?? null,
        })),
        pagination: result.pagination,
      },
      message: "Feedbacks retrieved successfully",
    };
  }

  async updateFeedback(
    id: string,
    data: UpdateFeedbackRequestDto,
    assignedByUserId?: string,
  ): Promise<ApiResponse<void>> {
    const existing = await this.feedbackRepository.get(id);
    if (!existing) {
      return {
        code: RESPONSE_CODE.FEEDBACK_NOT_FOUND,
        message: "Feedback not found",
      };
    }
    if ((existing.status as string) === "resolved") {
      return {
        code: RESPONSE_CODE.FEEDBACK_ALREADY_RESOLVED,
        message: "Feedback đã được xử lý, không thể cập nhật.",
      };
    }
    const previousAssigneeId = existing.assignedToUserId ?? null;
    const statusChangedToResolved =
      data.status === FeedbackStatusEnum.RESOLVED &&
      existing.status !== "resolved";
    const resolutionNote = data.resolutionNote?.trim() || undefined;
    const { resolutionNote: _resolutionNote, ...updatePayload } = data;

    let assignee: Awaited<ReturnType<IUserRepository["get"]>> = null;
    if (data.assignedToUserId != null) {
      assignee = await this.userRepository.get(data.assignedToUserId);
      if (!assignee) {
        return {
          code: RESPONSE_CODE.USER_NOT_FOUND,
          message: RESPONSE_MESSAGE.USER_NOT_FOUND,
        };
      }
    }
    const assigneeChanged =
      data.assignedToUserId != null &&
      data.assignedToUserId !== previousAssigneeId;

    if (!assigneeChanged) {
      const updatedRows = await this.feedbackRepository.update(
        { id },
        updatePayload,
      );
      if (updatedRows.length === 0) {
        return {
          code: RESPONSE_CODE.FEEDBACK_NOT_FOUND,
          message: "Feedback not found",
        };
      }

      if (statusChangedToResolved && existing.email) {
        this.messageQueueService
          .addEmail(
            EmailJobType.FEEDBACK_RESOLVED,
            {
              to: existing.email,
              recipientName: existing.name,
              feedbackSubject: existing.subject,
              resolutionNote,
            } as FeedbackResolvedEmailData,
            {
              attempts: 3,
              backoff: { type: "exponential", delay: 5000 },
            },
          )
          .catch((error) => {
            this.logger.error(
              `[updateFeedback] [addEmail] Error sending feedback resolved email to ${existing.email}: ${error}`,
            );
          });
      }

      return {
        code: RESPONSE_CODE.SUCCESS,
        message: "Feedback updated successfully",
      };
    }
    let feedbackSubjectForEmail = existing.subject;

    await this.feedbackRepository.executeWithTransaction(async (tx) => {
      const updatedRows = await this.feedbackRepository.update(
        { id },
        updatePayload,
        tx,
      );
      if (updatedRows.length === 0) {
        throw new BadRequestException({
          code: RESPONSE_CODE.FEEDBACK_NOT_FOUND,
          message: "Feedback not found",
        });
      }

      // Return if the assign myself
      if (assignedByUserId === data.assignedToUserId) {
        return;
      }
      const updated = updatedRows[0];
      feedbackSubjectForEmail = updated.subject;
      const messageBody =
        updated.subject.length > 480
          ? `${updated.subject.slice(0, 477)}...`
          : updated.subject;
      await this.notificationService.createAndSendToUser(
        {
          title: "Bạn được giao xử lý feedback",
          message: `Phản hồi: ${messageBody}`,
          type: NotificationType.FEEDBACK_ASSIGNED,
          senderId: assignedByUserId ?? undefined,
          payload: { feedbackId: id },
        },
        { userId: data.assignedToUserId! },
      );
    });

    if (assignee?.email && assignedByUserId !== data.assignedToUserId) {
      this.messageQueueService
        .addEmail(
          EmailJobType.FEEDBACK_ASSIGNED,
          {
            to: assignee.email,
            recipientName: assignee.name ?? "bạn",
            feedbackSubject: feedbackSubjectForEmail,
          } as FeedbackAssignedEmailData,
          {
            attempts: 3,
            backoff: {
              type: "exponential",
              delay: 5000,
            },
          },
        )
        .catch((error) => {
          this.logger.error(
            `[updateFeedback] [addEmail] Error sending feedback assigned email to ${assignee.email}: ${error}`,
          );
        });
    }

    if (statusChangedToResolved && existing.email) {
      this.messageQueueService
        .addEmail(
          EmailJobType.FEEDBACK_RESOLVED,
          {
            to: existing.email,
            recipientName: existing.name,
            feedbackSubject: feedbackSubjectForEmail,
            resolutionNote,
          } as FeedbackResolvedEmailData,
          {
            attempts: 3,
            backoff: { type: "exponential", delay: 5000 },
          },
        )
        .catch((error) => {
          this.logger.error(
            `[updateFeedback] [addEmail] Error sending feedback resolved email to ${existing.email}: ${error}`,
          );
        });
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: "Feedback updated successfully",
    };
  }

  async deleteFeedback(id: string): Promise<ApiResponse<void>> {
    const result = await this.feedbackRepository.delete({ id });
    if (result.length === 0) {
      return {
        code: RESPONSE_CODE.FEEDBACK_NOT_FOUND,
        message: "Feedback not found",
      };
    }

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: "Feedback deleted successfully",
      data: undefined,
    };
  }

  async getFeedbackTrends(
    query: FeedbackTrendsQueryDto,
  ): Promise<ApiResponse<FeedbackTrendsResponseDto>> {
    const trends = await this.feedbackRepository.getFeedbackTrends({
      fromDate: query.fromDate,
      toDate: query.toDate,
    });

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        data: trends,
      },
    };
  }
}
