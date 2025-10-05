import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import {
  CvDto,
  CvListResponseDto,
  CvRequestDto,
} from "@/interfaces/dtos/cv/cv.dto";
import { StorageUseCase } from "@/use-cases/storage/storage.use-case";
import { MultipartFile } from "@fastify/multipart";
import type { ICvRepository } from "@/core";
import { Cv } from "@/core";
import { Inject } from "@nestjs/common";

@Injectable()
export class CvUseCases {
  private readonly logger = new Logger(CvUseCases.name);
  constructor(
    private readonly storageUseCase: StorageUseCase,
    @Inject("ICvRepository") private readonly cvRepository: ICvRepository,
  ) {}

  async getUserCvs(userId: string): Promise<ApiResponse<CvListResponseDto>> {
    this.logger.log(`Getting CVs for user ${userId}`);
    const cvs = await this.cvRepository.getByUserId(userId);

    const cvDtos: CvDto[] = cvs.map((cv) => ({
      id: cv.id,
      userId: cv.userId,
      fileUrl: cv.fileUrl,
      fileName: cv.fileName,
      mimeType: cv.mimeType,
      fileSize: cv.fileSize,
      lastUsed: cv.lastUsed ? new Date(cv.lastUsed) : new Date(cv.createdAt),
      createdAt: new Date(cv.createdAt),
      updatedAt: cv.updatedAt ? new Date(cv.updatedAt) : null,
    }));

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: { cvs: cvDtos },
    };
  }

  async createCv(
    userId: string,
    file: MultipartFile | undefined,
    createCvDto: CvRequestDto,
  ): Promise<ApiResponse<CvDto>> {
    if (!file) {
      throw new BadRequestException("CV file is required");
    }

    try {
      // Upload file to Cloudinary
      const uploadResult = await this.storageUseCase.uploadFile(file);

      if (!uploadResult.data) {
        throw new BadRequestException("Failed to upload file to storage");
      }

      // Save CV record to database
      const newCv = await this.cvRepository.create({
        userId: userId,
        fileUrl: uploadResult.data.url,
        fileName: createCvDto.fileName,
        mimeType: createCvDto.mimeType,
        fileSize: createCvDto.fileSize,
        lastUsed: new Date(),
      });

      this.logger.log(
        `Created CV ${newCv.id} for user ${userId} with file URL: ${uploadResult.data.url}`,
      );

      const cvDto: CvDto = {
        id: newCv.id,
        userId: newCv.userId,
        fileUrl: newCv.fileUrl,
        fileName: newCv.fileName,
        mimeType: newCv.mimeType,
        fileSize: newCv.fileSize,
        lastUsed: newCv.lastUsed
          ? new Date(newCv.lastUsed)
          : new Date(newCv.createdAt),
        createdAt: new Date(newCv.createdAt),
        updatedAt: newCv.updatedAt ? new Date(newCv.updatedAt) : null,
      };

      return {
        message: RESPONSE_MESSAGE.SUCCESS,
        code: RESPONSE_CODE.SUCCESS,
        data: cvDto,
      };
    } catch (error) {
      this.logger.error(`Failed to create CV for user ${userId}:`, error);
      throw new BadRequestException("Failed to upload CV file");
    }
  }

  async updateCv(
    userId: string,
    cvId: string,
    file?: MultipartFile,
    updateCvDto?: CvRequestDto,
  ): Promise<ApiResponse<CvDto>> {
    try {
      let fileUrl: string | undefined;
      let uploadResult: any = undefined;

      if (file) {
        // Upload new file to Cloudinary
        uploadResult = await this.storageUseCase.uploadFile(file);
        if (!uploadResult.data) {
          throw new BadRequestException("Failed to upload file to storage");
        }
        fileUrl = uploadResult.data.url;
      }

      // Check if CV exists and belongs to user
      const existingCv = await this.cvRepository.getById(cvId);
      if (!existingCv || existingCv.userId !== userId) {
        throw new BadRequestException("CV not found or access denied");
      }

      // Prepare update data
      const updateData: Partial<Cv> = {
        updatedAt: new Date(),
      };

      if (fileUrl) {
        updateData.fileUrl = fileUrl;
      }

      if (updateCvDto?.fileName !== undefined) {
        updateData.fileName = updateCvDto.fileName;
      }

      if (updateCvDto?.mimeType !== undefined) {
        updateData.mimeType = updateCvDto.mimeType;
      }

      if (updateCvDto?.fileSize !== undefined) {
        updateData.fileSize = updateCvDto.fileSize;
      }

      // Update lastUsed when file is updated
      if (fileUrl) {
        updateData.lastUsed = new Date();
      }

      // Update CV record in database
      const updatedCv = await this.cvRepository.updateCv(cvId, updateData);
      if (!updatedCv) {
        throw new BadRequestException("Failed to update CV");
      }

      this.logger.log(`Updated CV ${cvId} for user ${userId}`);

      const cvDto: CvDto = {
        id: updatedCv.id,
        userId: updatedCv.userId,
        fileUrl: updatedCv.fileUrl,
        fileName: updatedCv.fileName,
        mimeType: updatedCv.mimeType,
        fileSize: updatedCv.fileSize,
        lastUsed: updatedCv.lastUsed
          ? new Date(updatedCv.lastUsed)
          : new Date(updatedCv.createdAt),
        createdAt: new Date(updatedCv.createdAt),
        updatedAt: updatedCv.updatedAt ? new Date(updatedCv.updatedAt) : null,
      };

      return {
        message: RESPONSE_MESSAGE.SUCCESS,
        code: RESPONSE_CODE.SUCCESS,
        data: cvDto,
      };
    } catch (error) {
      this.logger.error(
        `Failed to update CV ${cvId} for user ${userId}:`,
        error,
      );
      throw new BadRequestException("Failed to update CV");
    }
  }

  async deleteCv(
    userId: string,
    cvId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    try {
      // Get CV record from database to get file URL and check if it's default
      const cv = await this.cvRepository.getById(cvId);
      if (!cv || cv.userId !== userId) {
        throw new BadRequestException("CV not found or access denied");
      }

      // Delete CV record from database (soft delete)
      const deleted = await this.cvRepository.deleteCv(cvId);
      if (!deleted) {
        throw new BadRequestException("Failed to delete CV from database");
      }

      this.logger.log(`Deleted CV ${cvId} for user ${userId}`);

      return {
        message: RESPONSE_MESSAGE.SUCCESS,
        code: RESPONSE_CODE.SUCCESS,
        data: { message: "CV deleted successfully" },
      };
    } catch (error) {
      this.logger.error(
        `Failed to delete CV ${cvId} for user ${userId}:`,
        error,
      );
      throw new BadRequestException("Failed to delete CV");
    }
  }
}
