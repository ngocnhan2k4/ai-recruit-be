import { FeedbackUseCase } from "@/use-cases/feedback/feedback.use-case";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Body, Controller, Get, Post, Query, UseGuards } from "@nestjs/common";
import { ApiResponse, ApiResponseDto } from "@/interfaces/dtos";
import { GetUser } from "@/common/decorators";
import { type TokenPayload } from "@/common/types";
import {
  CreateFeedbackRequestDto,
  CreateFeedbackResponseDto,
  GetSubmittedSurveysQueryDto,
  GetSubmittedSurveysResponseDto,
} from "@/interfaces/dtos";
import {
  JwtAuthGuard,
  OptionalJwtAuthGuard,
} from "@/frameworks/auth-services/guards";

@ApiTags("Feedback")
@Controller("feedbacks")
export class FeedbackController {
  constructor(private readonly feedbackUseCase: FeedbackUseCase) {}

  @ApiOperation({
    summary: "Submit feedback",
    description:
      "Submit user feedback with optional images. Can be used with or without authentication.",
  })
  @UseGuards(OptionalJwtAuthGuard)
  @ApiResponseDto(CreateFeedbackResponseDto)
  @Post()
  async createFeedback(
    @Body() data: CreateFeedbackRequestDto,
    @GetUser() user?: TokenPayload,
  ): Promise<ApiResponse<CreateFeedbackResponseDto>> {
    return this.feedbackUseCase.createFeedback(data, user?.userId);
  }

  @ApiOperation({
    summary: "List UX surveys already submitted by the current user",
    description:
      "Returns the distinct `metadata.surveyKey` values previously submitted by the authenticated user. " +
      "Used by the FE to dedupe UX-survey dialogs across devices.",
  })
  @UseGuards(JwtAuthGuard)
  @ApiResponseDto(GetSubmittedSurveysResponseDto)
  @Get("me/surveys/submitted")
  async getSubmittedSurveys(
    @GetUser() user: TokenPayload,
    @Query() query: GetSubmittedSurveysQueryDto,
  ): Promise<ApiResponse<GetSubmittedSurveysResponseDto>> {
    return this.feedbackUseCase.getSubmittedSurveyKeys(
      user.userId,
      query.surveyKeys,
    );
  }
}
