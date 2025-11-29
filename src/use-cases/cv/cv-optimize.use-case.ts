import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { Inject } from "@nestjs/common";
import { IAIService } from "@/core/abstracts";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import {
  OptimizeAtsDto,
  OptimizeAtsResponseDto,
} from "@/interfaces/dtos/cv/optimize-ats.dto";
import { FileTextExtractor } from "@/common/utils/file-text-extractor";
import { CvLanguageEnum } from "@/core";
import type { MultipartFile } from "@fastify/multipart";

@Injectable()
export class CvOptimizeUseCase {
  private readonly logger = new Logger(CvOptimizeUseCase.name);

  constructor(
    @Inject(IAIService)
    private readonly aiService: IAIService,
  ) {}

  async optimizeCvForAts(
    file: MultipartFile,
    dto: OptimizeAtsDto,
  ): Promise<ApiResponse<OptimizeAtsResponseDto>> {
    this.logger.log("Starting CV optimization for ATS");

    // Validate file upload
    await this.validateFile(file);

    // Extract text from CV
    const cvText = await this.extractTextFromFile(file);

    // Call AI service to optimize CV
    try {
      const result = await this.aiService.optimizeCvAts({
        cvText,
        jobDescription: dto.jobDescription,
        language: dto.language || CvLanguageEnum.VIETNAMESE,
      });

      this.logger.log(
        `CV optimized successfully (ATS score: ${result.atsScore})`,
      );

      return {
        data: result,
        message: "CV optimized successfully",
        code: RESPONSE_CODE.SUCCESS,
      };
    } catch (error) {
      this.logger.error(`Failed to optimize CV: ${error.message}`, error.stack);
      throw new BadRequestException({
        message: `Failed to optimize CV: ${error.message}`,
        code: RESPONSE_CODE.CV_OPTIMIZATION_FAILED,
      });
    }
  }

  private async validateFile(file: MultipartFile): Promise<void> {
    if (!file) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.CV_FILE_REQUIRED,
        code: RESPONSE_CODE.CV_FILE_REQUIRED,
      });
    }

    // Get file size from Fastify MultipartFile
    const fileBuffer = await file.toBuffer();
    const fileSize = fileBuffer.length;

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (fileSize > maxSize) {
      throw new BadRequestException({
        message: `File size exceeds limit. Maximum: ${maxSize / 1024 / 1024}MB`,
        code: RESPONSE_CODE.FILE_TOO_LARGE,
      });
    }
  }

  private async extractTextFromFile(file: MultipartFile): Promise<string> {
    try {
      const buffer = await file.toBuffer();

      const cvText = await FileTextExtractor.extractText(buffer, file.mimetype);
      FileTextExtractor.validateText(cvText, 100);
      this.logger.log(
        `Extracted ${cvText.length} characters from CV file: ${file.filename}`,
      );
      return cvText;
    } catch (error) {
      this.logger.error(
        `Failed to extract text from CV: ${error.message}`,
        error.stack,
      );
      throw new BadRequestException({
        message: `Failed to extract text from CV: ${error.message}`,
        code: RESPONSE_CODE.TEXT_EXTRACTION_FAILED,
      });
    }
  }
}
