import { FeedbackUseCase } from "@/use-cases/feedback/feedback.use-case";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { Body, Controller, Headers, Post, UseGuards } from "@nestjs/common";
import { ApiResponse, ApiResponseDto } from "@/interfaces/dtos";
import { GetUser } from "@/common/decorators";
import { type TokenPayload } from "@/common/types";
import {
  CreateFeedbackRequestDto,
  CreateFeedbackResponseDto,
} from "@/interfaces/dtos";
import { OptionalJwtAuthGuard } from "@/frameworks/auth-services/guards";

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
    @Headers("accept-language") acceptLanguage?: string,
  ): Promise<ApiResponse<CreateFeedbackResponseDto>> {
    return this.feedbackUseCase.createFeedback(
      data,
      user?.userId,
      acceptLanguage,
    );
  }
}
