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
import {
  ApiOperation,
  ApiTags,
  ApiConsumes,
  ApiQuery,
  ApiBody,
  ApiParam,
} from "@nestjs/swagger";
// Remove Express file interceptor import
import { JwtAuthGuard } from "@/frameworks/auth-services/guards/jwt-auth.guard";
import { GetUser } from "@/common/decorators/get-user.decorator";
import type { TokenPayload } from "@/common/types/token";
import { ApiResponse, ApiResponseDto } from "../../dtos";
import { CvDto, CvListResponseDto, CvRequestDto } from "../../dtos/cv/cv.dto";
import { CvUseCases } from "@/use-cases/cv/cv.use-case";
import type { FastifyRequest } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import { RESPONSE_CODE } from "@/common/constants/response";
import { UploadFileAndBody } from "@/common/decorators/upload-file.decorater";
import { Cv } from "@/core";

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
}
