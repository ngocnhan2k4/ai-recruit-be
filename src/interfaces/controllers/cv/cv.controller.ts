import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Body,
  Param,
  UseGuards,
  Query,
  BadRequestException,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiTags,
  ApiConsumes,
  ApiQuery,
  ApiBody,
  ApiParam,
} from "@nestjs/swagger";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { GetUser } from "@/common/decorators/get-user.decorator";
import type { TokenPayload } from "@/common/types/token";
import { ApiResponse, ApiResponseDto } from "../../dtos";
import { CvDto, CvListResponseDto, CvRequestDto } from "../../dtos/cv/cv.dto";
import { CvUseCases } from "@/use-cases/cv/cv.use-case";
import type { MultipartFile } from "@fastify/multipart";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { UploadFileAndBody } from "@/common/decorators/upload-file.decorater";
import {
  OptimizeAtsDto,
  OptimizeAtsResponseDto,
} from "@/interfaces/dtos/cv/optimize-ats.dto";
import { CvOptimizeUseCase } from "@/use-cases/cv/cv-optimize.use-case";

@ApiTags("CV")
@Controller("cv")
@UseGuards(JwtAuthGuard)
export class CvController {
  constructor(
    private readonly cvUseCases: CvUseCases,
    private readonly cvOptimizeUseCase: CvOptimizeUseCase,
  ) {}

  @ApiOperation({
    summary: "Get user CVs",
    description:
      "Retrieve all CVs for a specific user or the authenticated user",
  })
  @ApiQuery({
    name: "userId",
    required: false,
    description:
      "User ID to get CVs for. If not provided, returns CVs for the authenticated user.",
    example: "uuid-user-id",
  })
  @ApiResponseDto(CvListResponseDto)
  @Get()
  async getUserCvs(
    @GetUser() user: TokenPayload,
    @Query("userId") userId?: string,
  ): Promise<ApiResponse<CvListResponseDto>> {
    const targetUserId = userId || user.userId;
    return this.cvUseCases.getUserCvs(targetUserId);
  }

  @ApiOperation({
    summary: "Get CV by Id",
  })
  @ApiParam({
    name: "id",
    required: true,
    description: "CV ID",
    example: "uuid-cv-id",
  })
  @ApiResponseDto(CvDto)
  @Get(":id")
  async getCvById(@Param("id") cvId: string): Promise<ApiResponse<CvDto>> {
    return this.cvUseCases.getCvById(cvId);
  }

  @ApiOperation({
    summary: "Create new CV",
    description: "Upload a new CV for the authenticated user",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        name: { type: "string" },
      },
      required: ["file", "name"],
    },
  })
  @ApiResponseDto(CvDto)
  @Post()
  async createCv(
    @GetUser() user: TokenPayload,
    @UploadFileAndBody()
    uploadFile: { file: MultipartFile; body: CvRequestDto },
  ): Promise<ApiResponse<CvDto>> {
    if (!uploadFile)
      throw new BadRequestException({
        message: "No file uploaded",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    return this.cvUseCases.createCv(user.userId, uploadFile.file, {
      ...uploadFile.body,
      fileName: uploadFile.file?.filename || undefined,
      mimeType: uploadFile.file?.mimetype,
      fileSize: uploadFile.file?.file ? uploadFile.file.file.bytesRead || 0 : 0,
    });
  }

  @ApiOperation({
    summary: "Update CV",
    description: "Update an existing CV",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        name: { type: "string" },
      },
    },
  })
  @ApiResponseDto(CvDto)
  @Put(":id")
  async updateCv(
    @GetUser() user: TokenPayload,
    @Param("id") cvId: string,
    @UploadFileAndBody({ required: false })
    uploadFile: { file?: MultipartFile; body: CvRequestDto },
  ): Promise<ApiResponse<CvDto>> {
    const updateCvDto: CvRequestDto = {
      ...uploadFile.body,
    };

    // Only update file-related fields if a new file is provided
    if (uploadFile.file) {
      updateCvDto.fileName = uploadFile.file?.filename || undefined;
      updateCvDto.mimeType = uploadFile.file?.mimetype;
      updateCvDto.fileSize = uploadFile.file?.file
        ? uploadFile.file.file.bytesRead || 0
        : 0;
    }

    return this.cvUseCases.updateCv(
      user.userId,
      cvId,
      uploadFile.file || undefined,
      updateCvDto,
    );
  }

  @ApiOperation({
    summary: "Delete CV",
    description: "Delete a CV",
  })
  @ApiResponseDto(CvDto)
  @Delete(":id")
  async deleteCv(
    @GetUser() user: TokenPayload,
    @Param("id") cvId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.cvUseCases.deleteCv(user.userId, cvId);
  }

  @Post("optimize-ats")
  @ApiOperation({
    summary: "Optimize CV for ATS",
    description:
      "Upload a CV file (PDF/DOCX) and get ATS-optimized version based on job description.",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      required: ["cvFile", "jobDescription"],
      properties: {
        cvFile: {
          type: "string",
          format: "binary",
          description: "CV file (PDF or DOCX, max 5MB)",
        },
        jobDescription: {
          type: "string",
          description: "Target job description",
          example: "Looking for Senior Backend Developer with Python...",
        },
        language: {
          type: "string",
          enum: ["vi", "en"],
          default: "vi",
          description: "Output language",
        },
      },
    },
  })
  @ApiResponseDto(OptimizeAtsResponseDto)
  async optimizeAts(
    @UploadFileAndBody()
    uploadFile: {
      file: MultipartFile;
      body: OptimizeAtsDto;
    },
  ): Promise<ApiResponse<OptimizeAtsResponseDto>> {
    if (!uploadFile.file) {
      throw new BadRequestException({
        message: RESPONSE_MESSAGE.CV_NOT_UPLOADED,
        code: RESPONSE_CODE.CV_NOT_UPLOADED,
      });
    }
    return await this.cvOptimizeUseCase.optimizeCvForAts(
      uploadFile.file,
      uploadFile.body,
    );
  }
}
