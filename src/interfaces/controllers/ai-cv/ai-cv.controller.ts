import { RESPONSE_CODE } from "@/common/constants";
import { GetUser, UploadFileAndBody } from "@/common/decorators";
import type { TokenPayload } from "@/common/types";
import { OptimizeAtsResponse } from "@/core";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";
import { ApiResponse, ApiResponseDto } from "@/interfaces/dtos";
import {
  AiCvDto,
  AiCvListResponseDto,
  AiCvRequestDto,
  UpdateAiCvDto,
} from "@/interfaces/dtos/ai-cv";
import { OptimizeAtsUploadDto } from "@/interfaces/dtos/cv";
import {
  CvFieldSuggestionRequestDto,
  CvFieldSuggestionResponseDto,
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

@ApiTags("AI CV")
@Controller("ai-cv")
@UseGuards(JwtAuthGuard)
export class AiCvController {
  constructor(private readonly aiCvUseCases: AiCvUseCases) {}

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
      "Optimize CV for ATS compatibility. Accepts either a CV file (PDF/DOCX) OR raw CV text. Supports two optimization modes: 1) Targeted optimization (with jobDescription) - matches CV against specific job requirements. 2) General optimization (without jobDescription) - optimizes CV for general ATS readability.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiResponseDto(OptimizeAtsResponse)
  async optimizeAts(
    @UploadFileAndBody({ required: false })
    request: OptimizeAtsUploadDto,
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<OptimizeAtsResponse>> {
    if (!request.file && !request.cvText) {
      return await this.aiCvUseCases.optimizeCvForAts(
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

    return await this.aiCvUseCases.optimizeCvForAts(
      request,
      user.userId,
      false,
    );
  }

  @Post("suggest-field")
  @ApiOperation({
    summary: "Suggest CV field value",
    description:
      "Generate AI-powered suggestion for a specific CV field. Returns a single suggestion as a raw string. Valid target fields: targetJobTitle, summary, experience.position, experience.achievements, skills.technical, skills.soft, projects.description, projects.technologies",
  })
  @ApiResponseDto(CvFieldSuggestionResponseDto)
  async suggestCvField(
    @Body() request: CvFieldSuggestionRequestDto,
    @GetUser() user: TokenPayload,
  ): Promise<ApiResponse<CvFieldSuggestionResponseDto>> {
    return await this.aiCvUseCases.suggestCvField(request, user.userId);
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
  ): Promise<ApiResponse<AiCvDto>> {
    return this.aiCvUseCases.getAiCvById(aiCvId);
  }

  @ApiOperation({
    summary: "Create new AI CV",
    description: "Save a new AI-generated CV",
  })
  @ApiBody({ type: AiCvRequestDto })
  @ApiResponseDto(AiCvDto)
  @Post()
  async createAiCv(
    @GetUser() user: TokenPayload,
    @Body() createAiCvDto: AiCvRequestDto,
  ) {
    return this.aiCvUseCases.createAiCv(user.userId, createAiCvDto);
  }

  @ApiOperation({
    summary: "Update AI CV",
    description: "Update an existing AI CV",
  })
  @ApiBody({ type: UpdateAiCvDto })
  @ApiResponseDto(AiCvDto)
  @Put(":id")
  async updateAiCv(
    @GetUser() user: TokenPayload,
    @Param("id") aiCvId: string,
    @Body() updateAiCvDto: UpdateAiCvDto,
  ) {
    return this.aiCvUseCases.updateAiCv(user.userId, aiCvId, updateAiCvDto);
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
