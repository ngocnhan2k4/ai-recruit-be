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
  Req,
  BadRequestException,
} from "@nestjs/common";
import { ApiOperation, ApiTags, ApiConsumes, ApiQuery } from "@nestjs/swagger";
// Remove Express file interceptor import
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { GetUser } from "@/common/decorators/get-user.decorator";
import type { TokenPayload } from "@/common/types/token";
import { ApiResponse, ApiResponseDto } from "../dtos";
import { CvDto, CvListResponseDto, CvRequestDto } from "../dtos/cv/cv.dto";
import { CvUseCases } from "@/use-cases/cv/cv.use-case";
import type { FastifyRequest } from "fastify";
import type { MultipartFile } from "@fastify/multipart";

@ApiTags("CV")
@Controller("cv")
@UseGuards(JwtAuthGuard)
export class CvController {
  constructor(private readonly cvUseCases: CvUseCases) {}

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
    summary: "Create new CV",
    description: "Upload a new CV for the authenticated user",
  })
  @ApiConsumes("multipart/form-data")
  @ApiResponseDto(CvDto)
  @Post()
  async createCv(
    @GetUser() user: TokenPayload,
    @Req() request: FastifyRequest,
  ): Promise<ApiResponse<CvDto>> {
    try {
      // Parse multipart data more efficiently
      const parts = request.parts();
      let fileData: MultipartFile | null = null;

      // Process parts efficiently - stop after finding first file
      for await (const part of parts) {
        if (part.type === "file") {
          fileData = part;
          break; // Stop after finding the first file
        }
      }

      if (!fileData) {
        throw new BadRequestException("CV file is required");
      }

      // Validate file type
      const allowedMimeTypes = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];
      if (!allowedMimeTypes.includes(fileData.mimetype)) {
        throw new BadRequestException(
          "Only PDF, DOC, and DOCX files are allowed",
        );
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (fileData.file && fileData.file.bytesRead > maxSize) {
        throw new BadRequestException("File size must be less than 10MB");
      }

      const createCvDto: CvRequestDto = {
        fileName: fileData.filename || "cv_file",
        mimeType: fileData.mimetype,
        fileSize: fileData.file.bytesRead || 0,
      };

      return this.cvUseCases.createCv(user.userId, fileData, createCvDto);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to create CV");
    }
  }

  @ApiOperation({
    summary: "Update CV",
    description: "Update an existing CV",
  })
  @ApiConsumes("multipart/form-data")
  @ApiResponseDto(CvDto)
  @Put(":id")
  async updateCv(
    @GetUser() user: TokenPayload,
    @Param("id") cvId: string,
    @Req() request: FastifyRequest,
  ): Promise<ApiResponse<CvDto>> {
    try {
      const parts = request.parts();
      let fileData: MultipartFile | null = null;

      // Process parts efficiently - stop after finding first file
      for await (const part of parts) {
        if (part.type === "file") {
          fileData = part;
          break; // Stop after finding the first file
        }
      }

      // Validate file if provided
      if (fileData) {
        const allowedMimeTypes = [
          "application/pdf",
          "application/msword",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        ];
        if (!allowedMimeTypes.includes(fileData.mimetype)) {
          throw new BadRequestException(
            "Only PDF, DOC, and DOCX files are allowed",
          );
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (fileData.file && fileData.file.bytesRead > maxSize) {
          throw new BadRequestException("File size must be less than 10MB");
        }
      }

      const updateCvDto: CvRequestDto = {};

      // Only update file-related fields if a new file is provided
      if (fileData) {
        updateCvDto.fileName = fileData.filename || undefined;
        updateCvDto.mimeType = fileData.mimetype;
        updateCvDto.fileSize = fileData.file ? fileData.file.bytesRead || 0 : 0;
      }

      return this.cvUseCases.updateCv(
        user.userId,
        cvId,
        fileData || undefined,
        updateCvDto,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException("Failed to update CV");
    }
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
}
