import { FeedbackUseCase } from "@/use-cases/feedback/feedback.use-case";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiResponse, ApiResponseDto } from "@/interfaces/dtos";
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
  ): Promise<ApiResponse<GetFeedbacksResponseDto>> {
    return this.feedbackUseCase.getFeedbacks(query);
  }

  @ApiOperation({
    summary: "Update feedback status",
    description: "Update the status of a feedback (Admin only)",
  })
  @Patch(":id")
  async updateFeedbackStatus(
    @Param("id") id: string,
    @Body() data: UpdateFeedbackRequestDto,
  ): Promise<ApiResponse<void>> {
    return this.feedbackUseCase.updateFeedback(id, data);
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
