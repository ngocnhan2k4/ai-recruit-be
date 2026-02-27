import {
  Controller,
  Post,
  Delete,
  Param,
  BadRequestException,
  Req,
  UseGuards,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import {
  ApiTags,
  ApiOperation,
  ApiBody,
  ApiParam,
  ApiConsumes,
  ApiBearerAuth,
} from "@nestjs/swagger";

import { DeleteFileResponseDto, UploadResponseDto } from "@/interfaces/dtos";
import { ApiResponseDto } from "@/interfaces/dtos/common/api-response.dto";
import { StorageUseCase } from "@/use-cases/storage/storage.use-case";
import { ApiResponse } from "@/interfaces/dtos";
import { RESPONSE_CODE } from "@/common/constants";
import { JwtAuthGuard } from "@/frameworks/auth-services/guards";

@ApiTags("File Upload")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("upload")
export class UploadController {
  constructor(private readonly storageService: StorageUseCase) {}

  @ApiOperation({
    summary: "Upload a file to Cloudinary",
    description:
      "Upload any file (image, document, etc.) to Cloudinary and get a public URL",
  })
  @ApiBody({
    description: "File upload",
    schema: {
      type: "object",
      properties: {
        file: {
          type: "string",
          format: "binary",
        },
      },
    },
  })
  @ApiConsumes("multipart/form-data")
  @ApiResponseDto(UploadResponseDto)
  @Post("file")
  async uploadFile(
    @Req() req: FastifyRequest,
  ): Promise<ApiResponse<UploadResponseDto>> {
    const data = await req.file();

    if (!data) {
      throw new BadRequestException({
        message: "No file uploaded",
        code: RESPONSE_CODE.BAD_REQUEST,
      });
    }

    const result = await this.storageService.uploadFile(data);

    return result;
  }

  @ApiOperation({
    summary: "Delete a file from Cloudinary",
    description: "Delete a file from Cloudinary by its public ID",
  })
  @ApiParam({
    name: "public_id",
    description: "Public ID of the file to delete",
  })
  @ApiResponseDto(DeleteFileResponseDto)
  @Delete(":public_id")
  async deleteFile(
    @Param("public_id") public_id: string,
  ): Promise<ApiResponse<DeleteFileResponseDto>> {
    return this.storageService.deleteFile(public_id);
  }
}
