import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { IAIService } from "@/core/abstracts";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/response";
import {
  CvFieldSuggestionRequestDto,
  CvFieldSuggestionResponseDto,
} from "@/interfaces/dtos/ai-cv/ai-cv-suggestion.dto";

@Injectable()
export class AiCvSuggestFieldUseCases {
  private readonly logger = new Logger(AiCvSuggestFieldUseCases.name);

  constructor(
    @Inject(IAIService)
    private readonly aiService: IAIService,
  ) {}

  async suggestCvField(
    request: CvFieldSuggestionRequestDto,
  ): Promise<ApiResponse<CvFieldSuggestionResponseDto>> {
    this.logger.log(`Generating suggestion for field: ${request.targetField}`);

    try {
      const result = await this.aiService.suggestCvField({
        cvData: request.cvData as any,
        targetField: request.targetField,
        fieldContext: request.fieldContext,
        jobDescription: request.jobDescription,
      });

      const response: CvFieldSuggestionResponseDto = {
        targetField: result.targetField,
        suggestion: result.suggestion,
        generatedAt: result.generatedAt,
      };

      return {
        data: response,
        message: "Field suggestion generated successfully",
        code: RESPONSE_CODE.SUCCESS,
      };
    } catch (error) {
      this.logger.error(error.message);
      throw new BadRequestException({
        message: error.message,
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }
  }
}
