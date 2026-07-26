import { RESPONSE_CODE } from "@/common/constants";
import { GetUser, UploadFileAndBody } from "@/common/decorators";
import type { TokenPayload } from "@/common/types";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { ApiResponse, ApiResponseDto } from "@/interfaces/dtos";
import {
  AiCvDto,
  AiCvListResponseDto,
  GenerateCvPdfRequestDto,
  UpdateAiCvV2Dto,
} from "@/interfaces/dtos/ai-cv";
import { OptimizeAtsUploadDto } from "@/interfaces/dtos/cv";
import {
  CvFieldSuggestionRequestDto,
  CvFieldSuggestionResponseV2Dto,
  LogSuggestionDecisionDto,
  AtsRawTextResponseDto,
  RegenerateAtsRawTextDto,
} from "@/interfaces/dtos/ai-cv";
import { AiCvUseCases } from "@/use-cases/ai-cv/ai-cv.use-cases";
import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import type { FastifyReply } from "fastify";

@ApiTags("AI CV")
@Controller("ai-cv")
@UseGuards(JwtAuthGuard)
export class AiCvController {
  constructor(private readonly aiCvUseCases: AiCvUseCases) {}

  @Post("export-pdf")
  @ApiOperation({
    summary: "Export CV as PDF",
    description: "Convert rendered CV HTML into a downloadable PDF file",
  })
  @ApiBody({ type: GenerateCvPdfRequestDto })
  async exportCvPdf(
    @Body() request: GenerateCvPdfRequestDto,
    @Res() reply: FastifyReply,
  ): Promise<void> {
    const pdfBuffer = await this.aiCvUseCases.exportCvPdf(request);

    reply
      .code(200)
      .header("Content-Type", "application/pdf")
      .header("Content-Disposition", 'attachment; filename="cv.pdf"')
      .header("Cache-Control", "no-store")
      .send(pdfBuffer);
  }

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
    summary: "Optimize CV for ATS (V2 Explainable AI)",
    description:
      "Optimize CV for ATS compatibility. Accepts either a CV file (PDF/DOCX) OR raw CV text. Supports two optimization modes: 1) Targeted optimization (with jobDescription) - matches CV against specific job requirements. 2) General optimization (without jobDescription) - optimizes CV for general ATS readability.",
  })
  @ApiConsumes("multipart/form-data")
  async optimizeAts(
    @UploadFileAndBody({ required: false })
    request: OptimizeAtsUploadDto,
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<{ taskId: string }>> {
    if (!request.file && !request.cvText) {
      return await this.aiCvUseCases.optimizeCvForAtsV2(
        request,
        user.userId,
        true,
      );
    }

    if (request.file && request.cvText) {
      throw new BadRequestException({
        message: "Provide either CV file or CV text, not both",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    return await this.aiCvUseCases.optimizeCvForAtsV2(
      request,
      user.userId,
      false,
    );
  }

  @Post("suggest-field")
  @ApiOperation({
    summary: "Suggest CV field value (V2)",
    description:
      "Generate AI-powered suggestions for a specific CV field. Returns 2-3 reasoned candidate chunks (action, originalText, suggestedText, reasoning) for diff/partial-accept review. Valid target fields: targetJobTitle, summary, experience.position, experience.achievements, skills.technical, skills.soft, projects.description, projects.technologies",
  })
  @ApiResponseDto(CvFieldSuggestionResponseV2Dto)
  async suggestCvField(
    @Body() request: CvFieldSuggestionRequestDto,
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<CvFieldSuggestionResponseV2Dto>> {
    return await this.aiCvUseCases.suggestCvField(request, user.userId);
  }

  @Post(":id/suggest-field/decision")
  @ApiOperation({
    summary: "Log a suggestion accept/reject decision",
    description:
      "Persist the user's accept/reject decision for a reviewed field-suggestion candidate, for audit/analytics.",
  })
  @ApiParam({
    name: "id",
    required: true,
    description: "AI CV ID",
    example: "uuid-ai-cv-id",
  })
  async logSuggestionDecision(
    @Param("id") aiCvId: string,
    @Body() decision: LogSuggestionDecisionDto,
    @GetUser() user: TokenPayload,
  ) {
    return await this.aiCvUseCases.logSuggestionDecision(
      user.userId,
      aiCvId,
      decision,
    );
  }

  @Get(":id/ats-raw-text")
  @ApiOperation({
    summary: "View as ATS Bot: get raw extracted text",
    description:
      "Returns the linear raw text an ATS parser would extract from the CV. For `version=optimized`, returns `cached: false` (no rawText) when the current CV content has changed since the last extraction — the caller must then POST rendered HTML to /ats-raw-text/optimized to regenerate it.",
  })
  @ApiParam({
    name: "id",
    required: true,
    description: "AI CV ID",
    example: "uuid-ai-cv-id",
  })
  @ApiQuery({ name: "version", enum: ["original", "optimized"] })
  @ApiResponseDto(AtsRawTextResponseDto)
  async getAtsRawText(
    @Param("id") aiCvId: string,
    @Query("version") version: "original" | "optimized",
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<AtsRawTextResponseDto>> {
    return await this.aiCvUseCases.getAtsRawText(
      aiCvId,
      user.userId,
      version === "original" ? "original" : "optimized",
    );
  }

  @Post(":id/ats-raw-text/optimized")
  @ApiOperation({
    summary: "View as ATS Bot: regenerate optimized CV raw text",
    description:
      "Renders the given HTML to PDF, extracts its raw text, caches it against a hash of the current CV content, and returns it.",
  })
  @ApiParam({
    name: "id",
    required: true,
    description: "AI CV ID",
    example: "uuid-ai-cv-id",
  })
  @ApiResponseDto(AtsRawTextResponseDto)
  async regenerateOptimizedAtsRawText(
    @Param("id") aiCvId: string,
    @Body() body: RegenerateAtsRawTextDto,
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<AtsRawTextResponseDto>> {
    return await this.aiCvUseCases.regenerateOptimizedAtsRawText(
      aiCvId,
      user.userId,
      body.html,
    );
  }

  @ApiOperation({
    summary: "Get AI CV by Id",
  })
  @ApiParam({
    name: "id",
    required: true,
    description: "AI CV ID",
    example: "uuid-ai-cv-id",
  })
  @ApiResponseDto(AiCvDto)
  @Get(":id")
  async getAiCvById(
    @Param("id") aiCvId: string,
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<AiCvDto>> {
    return this.aiCvUseCases.getAiCvById(aiCvId, user.userId);
  }

  @ApiOperation({
    summary: "Update AI CV (V2)",
    description:
      "Update an existing AI CV's editedCvData without mutating original cvData or Explainable AI metrics",
  })
  @ApiBody({ type: UpdateAiCvV2Dto })
  @ApiResponseDto(AiCvDto)
  @Put(":id")
  async updateAiCv(
    @GetUser() user: TokenPayload,
    @Param("id") aiCvId: string,
    @Body() updateAiCvV2Dto: UpdateAiCvV2Dto,
  ) {
    return this.aiCvUseCases.updateAiCvV2(user.userId, aiCvId, updateAiCvV2Dto);
  }

  @ApiOperation({
    summary: "Delete AI CV",
    description: "Permanently delete an AI CV",
  })
  @ApiParam({
    name: "id",
    required: true,
    description: "AI CV ID",
  })
  @Delete(":id")
  async deleteAiCv(@GetUser() user: TokenPayload, @Param("id") aiCvId: string) {
    return this.aiCvUseCases.deleteAiCv(user.userId, aiCvId);
  }
}
