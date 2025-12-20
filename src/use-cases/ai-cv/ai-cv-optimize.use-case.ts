import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { IAIService } from "@/core/abstracts";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants/response";
import { OptimizeAtsUploadDto } from "@/interfaces/dtos/cv/optimize-ats.dto";
import { CvLanguageEnum, OptimizeAtsResponse } from "@/core";
import { FileTextExtractor } from "@/common/utils/file-text-extractor";

@Injectable()
export class AiCvOptimizeUseCases {
  private readonly logger = new Logger(AiCvOptimizeUseCases.name);

  constructor(
    @Inject(IAIService)
    private readonly aiService: IAIService,
  ) {}

  async optimizeCvForAts(
    request: OptimizeAtsUploadDto,
  ): Promise<ApiResponse<OptimizeAtsResponse>> {
    this.logger.log("Starting CV optimization for ATS");

    // Call AI service to optimize CV
    try {
      const cvText = await FileTextExtractor.extractText(request.file);

      this.logger.log(`Extracted ${cvText.length} chars from CV`);

      const optimizeRequest = {
        cvText,
        language: request.body.language || CvLanguageEnum.VIETNAMESE,
        ...(request.body.jobDescription && {
          jobDescription: request.body.jobDescription,
        }),
      };

      this.logger.log(
        request.body.jobDescription
          ? "Performing targeted ATS optimization with job description"
          : "Performing general ATS optimization",
      );

      const result = await this.aiService.optimizeCvAts(optimizeRequest);

      result.language = request.body.language!;

      return {
        data: result,
        message: "CV optimized successfully",
        code: RESPONSE_CODE.SUCCESS,
      };
    } catch (error) {
      this.logger.error(error.message);
      throw new BadRequestException({
        message: error.message,
        code: RESPONSE_CODE.CV_OPTIMIZATION_FAILED,
      });
    }
  }
}
