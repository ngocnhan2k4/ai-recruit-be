import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE, RESPONSE_MESSAGE } from "@/common/constants/response";
import { CvDto, CvListResponseDto, CvRequestDto } from "@/interfaces/dtos";
import { StorageUseCase } from "@/use-cases/storage/storage.use-case";
import { MultipartFile } from "@fastify/multipart";
import { ICvRepository } from "@/core";
import { Cv } from "@/core";
import { Inject } from "@nestjs/common";

@Injectable()
export class CvUseCases {
  private readonly logger = new Logger(CvUseCases.name);
  constructor(
    private readonly storageUseCase: StorageUseCase,
    @Inject(ICvRepository) private readonly cvRepository: ICvRepository,
  ) {}

  async getUserCvs(userId: string): Promise<ApiResponse<CvListResponseDto>> {
    this.logger.log(`[getUserCvs] [get] Getting CVs for user ${userId}`);
    const cvs = await this.cvRepository.getByField({ userId: userId });

    const cvDtos: CvDto[] = cvs
      .map((cv) => ({
        id: cv.id,
        userId: cv.userId,
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
    const uploadResult = await this.storageUseCase.uploadFile(file);

    if (!uploadResult.data) {
      throw new BadRequestException({
        message: "Failed to upload file to storage",
        code: RESPONSE_CODE.ERROR_UPLOADING_FILE,
      });
    }

    // Save CV record to database
    const newCv = await this.cvRepository.create({
      userId: userId,
      name: createCvDto.name,
      fileUrl: uploadResult.data.url,
      fileName: createCvDto.fileName,
      mimeType: createCvDto.mimeType,
      lastUsed: new Date(),
    });

    this.logger.log(
      `[createCv] [create]Created CV ${newCv.id} for user ${userId} with file URL: ${uploadResult.data.url}`,
    );

    const cvDto: CvDto = {
      id: newCv.id,
      userId: newCv.userId,
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
      uploadResult = await this.storageUseCase.uploadFile(file);
      if (!uploadResult.data) {
        throw new BadRequestException({
          message: "Failed to upload file to storage",
          code: RESPONSE_CODE.ERROR_UPLOADING_FILE,
        });
      }
      fileUrl = uploadResult.data.url;
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

    const cvDto: CvDto = {
      id: updatedCv.id,
      userId: updatedCv.userId,
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

    this.logger.log(
      `[deleteCv] [delete] Deleted CV ${cvId} for user ${userId}`,
    );

    return {
      message: RESPONSE_MESSAGE.SUCCESS,
      code: RESPONSE_CODE.SUCCESS,
      data: { message: "CV deleted successfully" },
    };
  }
}
