import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { GetUser } from "@/common/decorators/get-user.decorator";
import { UploadFileAndBody } from "@/common/decorators/upload-file.decorater";
import type { TokenPayload } from "@/common/types/token";
import { OptimizeAtsResponse } from "@/core";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { ApiResponse, ApiResponseDto } from "@/interfaces/dtos";
import { AiCvListResponseDto } from "@/interfaces/dtos/ai-cv/ai-cv.dto";
import { OptimizeAtsUploadDto } from "@/interfaces/dtos/cv/optimize-ats.dto";
import { AiCvOptimizeUseCases } from "@/use-cases/ai-cv/ai-cv-optimize.use-case";
import { AiCvUseCases } from "@/use-cases/ai-cv/ai-cv.use-cases";
import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";

@ApiTags("AI CV")
@Controller("ai-cv")
@UseGuards(JwtAuthGuard)
export class AiCvController {
  constructor(
    private readonly aiCvUseCases: AiCvUseCases,
    private readonly aiCvOptimizeUseCase: AiCvOptimizeUseCases,
  ) {}

  @ApiOperation({
    summary: "Get AI CVs",
    description:
      "Retrieve all AI-optimized CVs for the authenticated user or a specific user.",
  })
  @ApiQuery({
    name: "userId",
    required: false,
    description:
      "User ID to get CVs for. If not provided, returns CVs for the authenticated user.",
    example: "uuid-user-id",
  })
  @ApiResponseDto(AiCvListResponseDto)
  @Get()
  async getAiCvs(
    @GetUser() user: TokenPayload,
    @Query("userId") userId?: string,
  ): Promise<ApiResponse<AiCvListResponseDto>> {
    const targetUserId = userId || user.userId;
    return this.aiCvUseCases.getAiCvs(targetUserId);
  }

  @Post("optimize-ats")
  @ApiOperation({
    summary: "Optimize CV for ATS",
    description:
      "Upload a CV file (PDF/DOCX) and get ATS-optimized version based on job description.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiResponseDto(OptimizeAtsResponse)
  @ApiBody({
    schema: {
      type: "object",
      required: ["file", "body"],
      properties: {
        file: {
          type: "string",
          format: "binary",
          description: "CV file (PDF or DOCX, max 5MB)",
        },
        body: {
          type: "string",
          description: "JSON string containing jobDescription and language",
          example: '{"jobDescription": "Senior Java Dev...", "language": "vi"}',
        },
      },
    },
  })
  async optimizeAts(
    @UploadFileAndBody()
    request: OptimizeAtsUploadDto,
  ): Promise<ApiResponse<OptimizeAtsResponse>> {
    if (!request.file) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.CV_NOT_UPLOADED,
        code: RESPONSE_CODE.CV_NOT_UPLOADED,
      });
    }
    return await this.aiCvOptimizeUseCase.optimizeCvForAts(request);
  }
}
