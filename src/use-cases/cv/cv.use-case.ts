import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ApiResponse } from "@/interfaces/dtos";
import { CV_FOLDER, RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants";
import { CvDto, CvListResponseDto, CvRequestDto } from "@/interfaces/dtos";
import { MultipartFile } from "@fastify/multipart";
import { CvEventType, ICvRepository } from "@/core";
import { Cv } from "@/core";
import { CloudinaryService } from "@/frameworks/storage/cloudinary/cloudinary.service";
import { IMessageQueueService } from "@/core/abstracts/message-queue.abstract";

@Injectable()
export class CvUseCases {
  private readonly logger = new Logger(CvUseCases.name);
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly cvRepository: ICvRepository,
    private readonly messageQueueService: IMessageQueueService,
  ) {}

  async getUserCvs(userId: string): Promise<ApiResponse<CvListResponseDto>> {
    this.logger.log(`[getUserCvs] [get] Getting CVs for user ${userId}`);
    const cvs = await this.cvRepository.getByField({ userId: userId });

    const cvDtos: CvDto[] = cvs
      .map((cv) => ({
        id: cv.id,
        userId: cv.userId,
        aiCvId: cv.aiCvId,
        name: cv.name,
        fileUrl: cv.fileUrl,
        fileName: cv.fileName,
        mimeType: cv.mimeType,
        lastUsed: cv.lastUsed ? new Date(cv.lastUsed) : new Date(cv.createdAt),
        createdAt: new Date(cv.createdAt),
        updatedAt: cv.updatedAt ? new Date(cv.updatedAt) : null,
      }))
      .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: { cvs: cvDtos },
    };
  }

  async getCvById(cvId: string): Promise<ApiResponse<CvDto>> {
    this.logger.log(`[getCvById] [get] Getting CVs by id ${cvId}`);
    const cv = await this.cvRepository.get(cvId);
    if (!cv) {
      throw new NotFoundException({
        message: RESPONSE_MESSAGE.CV_NOT_FOUND,
        code: RESPONSE_CODE.CV_NOT_FOUND,
      });
    }

    const cvDto = {
      ...cv,
      lastUsed: cv.lastUsed ? new Date(cv.lastUsed) : undefined,
      updatedAt: cv.updatedAt ? new Date(cv.updatedAt) : undefined,
      createdAt: new Date(cv.createdAt),
    } as CvDto;

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: cvDto,
    };
  }

  async createCv(
    userId: string,
    file: MultipartFile | undefined,
    createCvDto: CvRequestDto,
  ): Promise<ApiResponse<CvDto>> {
    if (!file) {
      throw new BadRequestException({
        message: "CV file is required",
        code: RESPONSE_CODE.CV_FILE_REQUIRED,
      });
    }

    // Upload file to Cloudinary
    const uploadResult = await this.cloudinaryService.uploadFile(file, {
      folder: CV_FOLDER,
    });

    if (!uploadResult || !uploadResult.secure_url) {
      throw new BadRequestException({
        message: "Failed to upload file to storage",
        code: RESPONSE_CODE.ERROR_UPLOADING_FILE,
      });
    }

    // Save CV record to database
    const newCv = await this.cvRepository.create({
      userId: userId,
      aiCvId: createCvDto.aiCvId,
      name: createCvDto.name,
      fileUrl: uploadResult.secure_url,
      fileName: createCvDto.fileName,
      mimeType: createCvDto.mimeType,
      lastUsed: new Date(),
    });

    this.logger.log(
      `[createCv] [create]Created CV ${newCv.id} for user ${userId} with file URL: ${uploadResult.secure_url}`,
    );

    // Fire-and-forget: extract + index CV asynchronously
    await this.messageQueueService.addCv(
      CvEventType.UPSERT_CV,
      {
        cvId: newCv.id,
      },
      {
        jobId: `cv.extract_and_index:${newCv.id}`,
      },
    );

    const cvDto: CvDto = {
      id: newCv.id,
      userId: newCv.userId,
      aiCvId: newCv.aiCvId,
      name: newCv.name,
      fileUrl: newCv.fileUrl,
      fileName: newCv.fileName,
      mimeType: newCv.mimeType,
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
  }

  async updateCv(
    userId: string,
    cvId: string,
    file?: MultipartFile,
    updateCvDto?: CvRequestDto,
  ): Promise<ApiResponse<CvDto>> {
    let fileUrl: string | undefined;
    let uploadResult: any = undefined;

    if (file) {
      // Upload new file to Cloudinary
      uploadResult = await this.cloudinaryService.uploadFile(file, {
        folder: CV_FOLDER,
      });
      if (!uploadResult || !uploadResult.secure_url) {
        throw new BadRequestException({
          message: "Failed to upload file to storage",
          code: RESPONSE_CODE.ERROR_UPLOADING_FILE,
        });
      }
      fileUrl = uploadResult.secure_url;
    }

    // Check if CV exists and belongs to user
    const existingCv = await this.cvRepository.get(cvId);
    if (!existingCv || existingCv.userId !== userId) {
      throw new BadRequestException({
        message: "CV not found or access denied",
        code: RESPONSE_CODE.CV_NOT_FOUND,
      });
    }

    // Prepare update data
    const updateData: Partial<Cv> = {};

    if (fileUrl) {
      updateData.fileUrl = fileUrl;
    }

    if (updateCvDto?.fileName !== undefined) {
      updateData.fileName = updateCvDto.fileName;
    }

    if (updateCvDto?.mimeType !== undefined) {
      updateData.mimeType = updateCvDto.mimeType;
    }

    if (updateCvDto?.name !== undefined) {
      updateData.name = updateCvDto.name;
    }

    if (updateCvDto?.aiCvId !== undefined) {
      updateData.aiCvId = updateCvDto.aiCvId;
    }

    if (fileUrl) {
      updateData.lastUsed = new Date();
    }
    // Update CV record in database
    const updatedRows = await this.cvRepository.update(
      { id: cvId },
      updateData,
    );
    const updatedCv = updatedRows[0];
    if (!updatedCv) {
      throw new BadRequestException({
        message: "Failed to update CV",
        code: RESPONSE_CODE.CV_NOT_UPDATED,
      });
    }

    this.logger.log(
      `[updateCv] [update] Updated CV ${cvId} for user ${userId}`,
    );

    await this.messageQueueService.addCv(
      CvEventType.UPSERT_CV,
      {
        cvId: cvId,
      },
      {
        jobId: `cv.extract_and_index:${cvId}`,
      },
    );

    const cvDto: CvDto = {
      id: updatedCv.id,
      userId: updatedCv.userId,
      aiCvId: updatedCv.aiCvId,
      name: updatedCv.name,
      fileUrl: updatedCv.fileUrl,
      fileName: updatedCv.fileName,
      mimeType: updatedCv.mimeType,
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
  }

  async deleteCv(
    userId: string,
    cvId: string,
  ): Promise<ApiResponse<{ message: string }>> {
    // Get CV record from database to get file URL and check if it's default
    const cv = await this.cvRepository.get(cvId);
    if (!cv || cv.userId !== userId) {
      throw new BadRequestException({
        message: "CV not found or access denied",
        code: RESPONSE_CODE.CV_NOT_FOUND,
      });
    }

    // Delete CV record from database (soft delete)
    const result = await this.cvRepository.deletePermanently({ id: cvId });
    if (result.length === 0) {
      throw new BadRequestException({
        message: "Failed to delete CV from database",
        code: RESPONSE_CODE.CV_NOT_DELETED,
      });
    }

    await this.messageQueueService.addCv(
      CvEventType.DELETE_CV,
      {
        cvId: cvId,
      },
      {
        jobId: `cv.sync:${cvId}`,
      },
    );

    this.logger.log(
      `[deleteCv] [delete] Deleted CV ${cvId} for user ${userId}`,
    );

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: { message: "CV deleted successfully" },
    };
  }

  async checkAiCvExists(
    userId: string,
    aiCvId: string,
  ): Promise<ApiResponse<{ exists: boolean }>> {
    const existingCv = await this.cvRepository.getByField({
      userId,
      aiCvId,
    });

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: { exists: existingCv.length > 0 },
    };
  }
}
