import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import {
  FeedbackStatusEnum,
  IFeedbackRepository,
  IUserRepository,
  NewFeedback,
} from "@/core";
import { FeedbackFilter } from "@/core/entities/feedback.entity";
import {
  ApiResponse,
  FeedbackTrendsResponseDto,
  FeedbackTrendsQueryDto,
} from "@/interfaces/dtos";
import { Injectable, Logger } from "@nestjs/common";
import {
  CreateFeedbackRequestDto,
  CreateFeedbackResponseDto,
  GetFeedbacksResponseDto,
  UpdateFeedbackRequestDto,
} from "@/interfaces/dtos";

@Injectable()
export class FeedbackUseCase {
  private readonly logger = new Logger(FeedbackUseCase.name);

  constructor(
    private readonly feedbackRepository: IFeedbackRepository,
    private readonly userRepository: IUserRepository,
  ) {}

  async createFeedback(
    data: CreateFeedbackRequestDto,
    userId?: string,
  ): Promise<ApiResponse<CreateFeedbackResponseDto>> {
    const user = userId ? await this.userRepository.get(userId) : null;

    const newFeedback: NewFeedback = {
      name: data.name || user?.name || "Anonymous",
      subject: data.subject,
      message: data.message,
      images: data.images,
      userId,
    };

    const created = await this.feedbackRepository.create(newFeedback);

    this.logger.log(`Feedback created successfully: ${created.id}`);

    return {
      code: RESPONSE_CODE.SUCCESS,
      data: {
        feedback: {
          ...created,
          status: created.status as FeedbackStatusEnum,
        },
      },
      message: "Feedback submitted successfully",
    };
  }

  async getFeedbacks(
    filter: FeedbackFilter,
  ): Promise<ApiResponse<GetFeedbacksResponseDto>> {
    const result = await this.feedbackRepository.getFeedbacks(filter);

    console.log("Retrieved feedbacks:", result);

    this.logger.log(`Retrieved ${result.data.length} feedbacks`);

    return {
      code: RESPONSE_CODE.SUCCESS,
      data: {
        data: result.data.map((feedback) => ({
          ...feedback,
          status: feedback.status as FeedbackStatusEnum,
        })),
        pagination: result.pagination,
      },
      message: "Feedbacks retrieved successfully",
    };
  }

  async updateFeedback(
    id: string,
    data: UpdateFeedbackRequestDto,
  ): Promise<ApiResponse<void>> {
    const feedback = await this.feedbackRepository.update({ id }, data);

    if (!feedback) {
      return {
        code: RESPONSE_CODE.FEEDBACK_NOT_FOUND,
        message: "Feedback not found",
      };
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

    console.log("Retrieved feedback trends:", trends);

    return {
      code: RESPONSE_CODE.SUCCESS,
      message: RESPONSE_MESSAGE.SUCCESS,
      data: {
        data: trends,
      },
    };
  }
}
