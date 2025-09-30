import {
  Controller,
  Post,
  Delete,
  Param,
  BadRequestException,
  Req,
} from "@nestjs/common";
import type { FastifyRequest } from "fastify";
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse as SwaggerApiResponse,
  ApiParam,
  ApiBearerAuth,
} from "@nestjs/swagger";

import { UploadFileDto, UploadResultDto } from "@/interfaces/dtos/upload.dto";
import { ApiResponse as CustomApiResponse } from "@/interfaces/dtos/common/api-response.dto";
import { StorageUseCase } from "@/use-cases/storage/storage.use-case";
import { ApiResponse } from "@/interfaces/dtos";
@ApiTags("File Upload")
@Controller("upload")
export class UploadController {
  constructor(private readonly storageService: StorageUseCase) {}

  @ApiOperation({
    summary: "Upload a file to Cloudinary",
    description:
      "Upload any file (image, document, etc.) to Cloudinary and get a public URL",
  })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "File upload",
    type: UploadFileDto,
  })
  @SwaggerApiResponse({
    status: 201,
    description: "File uploaded successfully",
    type: CustomApiResponse<UploadResultDto>,
  })
  @SwaggerApiResponse({
    status: 400,
    description: "Bad request - invalid file or file too large",
  })
  @ApiBearerAuth()
  @Post()
  async uploadFile(
    @Req() req: FastifyRequest,
  ): Promise<ApiResponse<{ url: string; public_id: string; format: string }>> {
    const data = await req.file();

    if (!data) {
      throw new BadRequestException("No file uploaded");
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
  @SwaggerApiResponse({
    status: 200,
    description: "File deleted successfully",
    type: CustomApiResponse<{ message: string }>,
  })
  @SwaggerApiResponse({
    status: 400,
    description: "Bad request - invalid public ID",
  })
  @ApiBearerAuth()
  @Delete(":public_id")
  async deleteFile(
    @Param("public_id") public_id: string,
  ): Promise<ApiResponse<{ message: string }>> {
    return this.storageService.deleteFile(public_id);
  }
}
