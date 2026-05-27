import { FeedbackUseCase } from "@/use-cases/feedback/feedback.use-case";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiResponse,
  ApiResponseDto,
  PaginatedResultDto,
} from "@/interfaces/dtos";
import {
  GetFeedbacksRequestDto,
  GetFeedbacksResponseDto,
  UpdateFeedbackRequestDto,
  FeedbackTrendsQueryDto,
  FeedbackTrendsResponseDto,
} from "@/interfaces/dtos/feedback";
import {
  JwtAuthGuard,
  SystemAuthorizeGuard,
} from "@/frameworks/auth-services/guards";
import { GetUser } from "@/common/decorators";
import { type TokenPayload } from "@/common/types";

@ApiTags("Feedback Admin")
@UseGuards(JwtAuthGuard, SystemAuthorizeGuard)
@Controller("admin/feedbacks")
export class FeedbackAdminController {
  constructor(private readonly feedbackUseCase: FeedbackUseCase) {}

  @ApiOperation({
    summary: "Get all feedbacks",
    description: "Get paginated list of feedbacks (Admin only)",
  })
  @ApiResponseDto(GetFeedbacksResponseDto)
  @Get()
  async getFeedbacks(
    @Query() query: GetFeedbacksRequestDto,
    @Headers("accept-language") acceptLanguage?: string,
  ): Promise<ApiResponse<PaginatedResultDto<GetFeedbacksResponseDto>>> {
    return this.feedbackUseCase.getFeedbacks(query, acceptLanguage);
  }

  @ApiOperation({
    summary: "Update feedback",
    description:
      "Update status and/or assign a handler (assignedToUserId). Assigning sends in-app notification and email to the assignee (Admin only)",
  })
  @Patch(":id")
  async updateFeedbackStatus(
    @Param("id") id: string,
    @Body() data: UpdateFeedbackRequestDto,
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<void>> {
    return this.feedbackUseCase.updateFeedback(id, data, user.userId);
  }

  @ApiOperation({
    summary: "Delete feedback",
    description: "Delete a feedback (Admin only)",
  })
  @Delete(":id")
  async deleteFeedback(@Param("id") id: string): Promise<ApiResponse<void>> {
    return this.feedbackUseCase.deleteFeedback(id);
  }

  @ApiOperation({
    summary: "Get feedback trends",
    description: "Get feedback submission trends over time",
  })
  @ApiResponseDto(FeedbackTrendsResponseDto)
  @Get("trends")
  async getFeedbackTrends(
    @Query() query: FeedbackTrendsQueryDto,
  ): Promise<ApiResponse<FeedbackTrendsResponseDto>> {
    return this.feedbackUseCase.getFeedbackTrends(query);
  }
}
